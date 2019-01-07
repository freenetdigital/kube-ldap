// @flow
import {Logger} from 'winston';
import atob from 'atob';
import jwt from 'jsonwebtoken';
import {Authenticator, Mapping} from '../ldap';

/** Class for UserAuthentication API route */
export default class UserAuthentication {
  authenticator: Authenticator;
  tokenLifetime: number;
  key: string;
  mapping: Mapping;
  logger: Logger;
  run: (Object, Object) => void

  /**
  * Create API route
  * @param {Authenticator} authenticator - Authenticator.
  * @param {number} tokenLifetime - Token lifetime.
  * @param {string} key - Private key for token signing.
  * @param {Mapping} mapping - Attribute mapping (kubernetes<=>ldap).
  * @param {Logger} logger - Logger to use.
  */
  constructor(
    authenticator: Authenticator,
    tokenLifetime: number,
    key: string,
    mapping: Mapping,
    logger: Logger
  ) {
    this.authenticator = authenticator;
    this.tokenLifetime = tokenLifetime;
    this.key = key;
    this.mapping = mapping;
    this.logger = logger;
    this.run = this.run.bind(this);
  }

  /**
  * Run API route
  * @param {Object} req - Request.
  * @param {Object} res - Response.
  * @return {Promise}
  */
  run(req: Object, res: Object) {
    let authHeader = req.get('Authorization');
    if (!authHeader) {
      this._sendUnauthorized(res);
    } else {
      try {
        let credentials = UserAuthentication.parseBasicAuthHeader(authHeader);
        return this.authenticator.authenticate(
          credentials.username,
          credentials.password
        ).then((success) => {
          if (!success) {
            this._sendUnauthorized(res);
          } else {
            return this.getToken(credentials.username).then((token) => {
              res.send(token);
            }, (error) => {
              this.logger.error(error);
              res.sendStatus(500);
            });
          }
        }, (error) => {
          this.logger.info(error);
          res.sendStatus(500);
        });
      } catch (error) {
        this.logger.info(error.message);
        res.sendStatus(400);
      }
    }
  }

  /**
  * Send an HTTP 401 (Unauthorized) response including a WWW-Authenticate header
  * @param {Object} res - Response.
  */
  _sendUnauthorized(res: Object): void {
    res.set('WWW-Authenticate', 'Basic realm="kubernetes"');
    res.sendStatus(401);
  }

  /**
  * Get/Generate token for user
  * @param {string} username - Username.
  * @return {string}
  */
  async getToken(username: string): Promise<string> {
    try {
      let user = await this.authenticator.getAttributes(
        username,
        this.mapping.getLdapAttributes()
      );

      let data = this.mapping.ldapToKubernetes(user);
      let token = jwt.sign(data, this.key, {
        expiresIn: this.tokenLifetime,
      });

      return token;
    } catch (error) {
      throw error;
    }
  }

  /**
  * Parse HTTP "Authorization" header into username/password
  * @param {string} authHeader - Authorization header.
  * @return {Object}
  */
  static parseBasicAuthHeader(authHeader: string): Object {
    let parts = authHeader.split(' ');
    if (parts[0] !== 'Basic' || parts.length < 2) {
      throw new Error('not a valid http basic authorization header');
    }

    let credentials = atob(parts[1]).split(':');
    if (credentials.length < 2) {
      throw new Error('not a valid http basic authorization header');
    }
    return {
      username: credentials[0],
      password: credentials[1],
    };
  }
}
