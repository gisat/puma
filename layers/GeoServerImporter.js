let request = require('superagent');
let Promise = require('promise');
let _ = require('lodash');

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
    importLayer(layer) {
        let id;
        let vectorDatastore = {
            dataStore: {
                name: this._dataStore
            }
        };
        
        return request
            .post(this._importPath)
            .set('Content-Type', 'application/json')
            .auth(this._userName, this._password)
            .send({
                import: {
                    targetWorkspace: {
                        workspace: {
                            name: this._workspace
                        }
                    },
                    targetStore: layer.type == "vector" ? vectorDatastore : undefined,
                    data: {
                        type: "directory",
                        location: layer.directory
                    }
                }
            })
            .then(response => {
                let importerResponse = response.body.import;
                let importUrl = importerResponse.href;
                let importTasks = importerResponse.tasks;
                
                if (!importTasks.length) {
                    throw new Error(importerResponse.href);
                }
                
                let allReady = true;
                _.each(importTasks, importTask => {
                    if (importTask.state != "READY") {
                        allReady = !allReady;
                    }
                });
                
                if(!allReady) {
                    throw new Error(importerResponse.href);
                }
                
                return request
                    .post(importUrl)
                    .auth(this._userName, this._password)
                    .then(() => {
                        return request
                            .get(importUrl)
                            .auth(this._userName, this._password)
                            .then(response => {
                                let importerResponse = response.body.import;
                                let importerTasks = importerResponse.tasks;
                                _.each(importerTasks, task => {
                                    if(task.state == "ERROR") {
                                        throw new Error(task.href);
                                    }
                                })
                            })
                    })
            });
    }
}

// TODO: Store the data about the layer in the pg table for layer.

module
    .exports = GeoServerImporter;