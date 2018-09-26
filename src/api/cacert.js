// @flow

/** Class for CACert API route */
export default class CACert {
  /**
  * Run API route
  * @param {Object} req - Request.
  * @param {Object} res - Response.
  */
  run(req: Object, res: Object) {
    const fs = require('fs');
    
    //read ca.crt from disk and return it to the user  
    fs.readFile('/etc/kubernetes/pki/ca.crt', (error, data) => {
      if (error) res.sendStatus(404);
      res.send(data);
    });
  }
}
