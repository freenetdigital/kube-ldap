// @flow
import {canonicalizeDn} from '../ldap';
import {Logger} from 'winston';
import Client from './client';


/** Class for an Kubernetes<=>LDAP attribute mapping */
class Mapping {
  client: Client;
  username: string;
  uid: string;
  groups: string;
  logger: Logger;
  extraFields: Array<string>

  /**
  * Create an Kubernetes<=>LDAP attribute mapping.
  * @param {Client} client - The ldap client.
  * @param {string} username - Attribute name for the kubernetes username.
  * @param {string} uid - Attribute name for the kubernetes uid.
  * @param {string} groups - Attribute name for the kubernetes groups array.
  * @param {Array<string>} extraFields - Array of kubernetes extra attributes
  * @param {Logger} logger - Logger to use.
  */
  constructor(
    client: Client,
    username: string,
    uid: string,
    groups: string,
    extraFields: Array<string>,
    logger: Logger
  ) {
    this.client = client;
    this.username = username;
    this.uid = uid;
    this.groups = groups;
    this.extraFields = extraFields;
    this.logger = logger;
  }

  /**
  * Get array of LDAP attribute names
  * @return {Array<string>}
  */
  getLdapAttributes(): Array<string> {
    let attributes = [this.username, this.uid, this.groups];
    return attributes.concat(this.extraFields);
  }

  /**
  *
  *
  */
  recurseNestedGroups(groups: Array<string>) {
    for (let group in groups) {
      console.log(group);
    }
  }

  /**
  * Convert ldap object to kubernetes
  * @param {Object} ldapObject - Ldap object to convert
  * @return {Ôbject}
  */
  async ldapToKubernetes(ldapObject: Object): Object {
    // If the ldapObject "user" is not a member of any groups
    // the conversion to a map fails and causes an exception.
    var object
    // Get nested group memebership now
    // Our code here
    // LDAP_MATCHING_RULE_IN_CHAIN (https://ldapwiki.com/wiki/1.2.840.113556.1.4.1941)
    // MS AD specific
    let matchingChainFilter = "(member:1.2.840.113556.1.4.1941:=" + ldapObject.dn +")"
    let ldapNestedGroups = await this.client.search(matchingChainFilter)
    for (var i in ldapNestedGroups) {
      if (ldapObject[this.groups].includes(ldapNestedGroups[i].dn) == false) {
        ldapObject[this.groups].push(ldapNestedGroups[i].dn)
      }
    }

    if (ldapObject[this.groups]) {
      object = {
        username: ldapObject[this.username],
        uid: ldapObject[this.uid],
        groups: ldapObject[this.groups].map((group) => {
          return canonicalizeDn(group);
        }),
        extra: {},
      };
    } else {
      object = {
        username: ldapObject[this.username],
        uid: ldapObject[this.uid],
        groups: [],
        extra: {},
      };
    }
    for (let extraField of this.extraFields) {
      object.extra[extraField] = ldapObject[extraField];
    }
    return object;
  }
}

export default Mapping;
