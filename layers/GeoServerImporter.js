let request = require('superagent');
let fs = require('fs');
let path = require('path');
let Promise = require('promise');

/**
 * This class handles layers to be imported into the GeoServer.
 */
class GeoServerImporter {
    constructor(geoServerPath, userName, password, workspace, dataStore) {
        this._importPath = geoServerPath + '/rest/imports';
        
        this._userName = userName;
        this._password = password;
        this._workspace = workspace;
        this._dataStore = dataStore;
    }
    
    // TODO: Configure the name of the workspace to import into.
    // TODO: Configure the name of the target data store.
    importLayer(file) {
        let id;
        let fileExtension = file.name.slice((file.name.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
        
        let importShpTemplate = {
            targetWorkspace: {
                workspace: {
                    name: this._workspace
                }
            },
            targetStore: {
                dataStore: {
                    name: this._dataStore
                }
            }
        };
        let importRasterTemplate = {
            targetWorkspace: {
                workspace: {
                    name: this._workspace
                }
            }
        };
        
        return new Promise((resolve, reject) => {
            let fileDirectory = path.dirname(file.path);
            let newFilePath = `${fileDirectory}/${file.name}`;
            fs.rename(file.path, newFilePath, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(newFilePath);
                }
            });
        }).then(newFilePath => {
            if (fileExtension.includes('tif')) {
                return request
                    .post(this._importPath)
                    .set('Content-Type', 'application/json')
                    .auth(this._userName, this._password)
                    .send({"import": importRasterTemplate}).then(response => {
                        id = response.body.import.id;
                        return request
                            .post(`${this._importPath}/${id}/tasks`)
                            .auth(this._userName, this._password)
                            .attach('filedata', newFilePath)
                    }).then((response) => {
                        return request
                            .post(`${this._importPath}/${id}`)
                            .auth(this._userName, this._password)
                    });
            } else {
                return request
                    .post(this._importPath)
                    .set('Content-Type', 'application/json')
                    .auth(this._userName, this._password)
                    .send({"import": importShpTemplate}).then(response => {
                        id = response.body.import.id;
                        return request
                            .post(`${this._importPath}/${id}/tasks`)
                            .auth(this._userName, this._password)
                            .attach('filedata', newFilePath)
                    }).then(() => {
                        return request
                            .put(`${this._importPath}/${id}/tasks/0/target`)
                            .set('Content-Type', 'application/json')
                            .auth(this._userName, this._password)
                            .send(importShpTemplate.targetStore)
                    }).then(() => {
                        return request
                            .post(`${this._importPath}/${id}`)
                            .auth(this._userName, this._password)
                    }).then(() => {
                        return request
                            .get(`${this._importPath}/${id}/tasks/0/layer`)
                            .auth(this._userName, this._password)
                            .then(response => {
                                return response.body;
                            })
                    });
            }
        });
    }
}
// TODO: Store the data about the layer in the pg table for layer.

module.exports = GeoServerImporter;