let fs = require('fs');
let logger = require('../common/Logger').applicationWideLogger;

class VersionController {
    constructor(app, frontOfficeAppLocation, boAppLocation, backendAppLocation) {
        app.get('/rest/fo/version', this.version.bind(this, frontOfficeAppLocation));
        app.get('/rest/backend/version', this.version.bind(this, boAppLocation));
        app.get('/rest/bo/version', this.version.bind(this, backendAppLocation));
    }

    version(versionFile, request, response) {
        fs.readFile(versionFile, (err, content) => {
            if(err){
                logger.error(`VersionController#version Error: `, err);
                response.json({status: "err", message: err});
            } else {
                response.json({status: "ok", version: content});
            }
        });
    }
}

module.exports = VersionController;