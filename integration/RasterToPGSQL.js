let fs = require('fs');
let path = require('path');
let Promise = require('promise');
let child_process = require('pn/child_process');

class RasterToPGSQL {
    constructor(pgHost, pgUser, pgPassword, pgDatabase) {
        this._pgHost = pgHost;
        this._pgUser = pgUser;
        this._pgPassword = pgPassword;
        this._pgDatabase = pgDatabase;
    }
    
    import(layer) {
        return new Promise((resolve, reject) => {
            child_process.exec(`
                raster2pgsql -d -I -C -k -F -t 512x512 ${layer.directory}${layer.files[0]} public."${layer.systemName}" | PGPASSWORD=${this._pgPassword} psql -h ${this._pgHost} -U ${this._pgUser} ${this._pgDatabase}
            `, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({
                        stdout: stdout,
                        stderr: stderr
                    });
                }
            });
        });
    }
}

module.exports = RasterToPGSQL;