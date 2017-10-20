let request = require('superagent');
let Promise = require('promise');
let _ = require('lodash');

/**
 * This class handles layers to be imported into the GeoServer.
 */
class GeoServerImporter {
    constructor(geoServerPath, userName, password, workspace, dataStore) {
        this._geoserverPath = geoServerPath;
        this._importPath = geoServerPath + '/rest/imports';
        this._layersPath = `${geoServerPath}/rest/layers`;

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
            .get(`${this._geoserverPath}/rest/workspaces/${this._workspace}/coveragestores.json`)
            .set('Content-Type', 'application/json')
            .auth(this._userName, this._password)
            .then(async response => {
                if (layer.type === 'raster') {
                    if (await this.isLayerExistsInGeoserver(layer.systemName) && layer.replace) {
                        return request
                            .delete(`${this._geoserverPath}/rest/workspaces/${this._workspace}/coveragestores/${layer.systemName}?recurse=true&purge=all`)
                            .auth(this._userName, this._password)
                            .then(() => {
                                return request
                                    .delete(`${this._geoserverPath}/rest/styles/${this._workspace}_${layer.systemName}`)
                                    .auth(this._userName, this._password);
                            });
                    } else if (existingCoverageStores.length && !layer.replace) {
                        throw new Error(`Layer already exists in geoserver!`);
                    }
                }
            })
            .then(() => {
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
                            targetStore: layer.type === "vector" ? vectorDatastore : undefined,
                            data: {
                                type: `${layer.hasOwnProperty('direcotry') ? 'directory' : 'file'}`,
                                [layer.hasOwnProperty('direcotry') ? 'directory' : 'file']: layer.hasOwnProperty('directory') ? layer.directory : layer.file
                            }
                        }
                    })
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
                    if (importTask.state !== "READY") {
                        allReady = !allReady;
                    }
                });

                if (!allReady) {
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
                                let taskResults = [];
                                _.each(importerTasks, task => {
                                    if (task.state === "ERROR") {
                                        throw new Error(task.href);
                                    }
                                    taskResults.push(
                                        request
                                            .get(`${task.href}/layer`)
                                            .then(response => {
                                                return response.body.layer;
                                            })
                                    );
                                });
                                return Promise.all(taskResults);
                            })
                    });
            });
    }

    async isLayerExistsInGeoserver(layerName) {
        return request
            .get(`${this._layersPath}.json`)
            .set('Content-Type', 'application/json')
            .auth(this._userName, this._password)
            .then(response => {
                let existingLayers = _.filter(response.body.layers.layer, {name: layerName});
                if(existingLayers.length) {
                    return true;
                } else {
                    return false;
                }
            });
    }

    async getGeoserverMissingLayers(layerNames) {
        return request
            .get(`${this._layersPath}.json`)
            .set('Content-Type', 'application/json')
            .auth(this._userName, this._password)
            .then(response => {
                return _.reject(response.body.layers.layer, layer => {
                    return layerNames.includes(layer.name);
                });
            });
    }
}

// TODO: Store the data about the layer in the pg table for layer.

module
    .exports = GeoServerImporter;