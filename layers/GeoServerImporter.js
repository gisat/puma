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
    importLayer(layer, replaceExisting) {
        let id;
        let vectorDatastore = {
            dataStore: {
                name: this._dataStore
            }
        };

        return Promise.resolve().then(() => {
            if (layer.type === 'raster') {
                if (replaceExisting) {
                    return this.removeRasterLayer(layer.systemName);
                }
            }
        }).then(() => {
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
                            name: layer.systemName,
                            type: `${layer.hasOwnProperty('direcotry') ? 'directory' : 'file'}`,
                            [layer.hasOwnProperty('direcotry') ? 'directory' : 'file']: layer.hasOwnProperty('directory') ? layer.directory : layer.file
                        }
                    }
                })
        }).then((response) => {
            let importTask = response.body.import;
            if(importTask) {
                return request
                    .post(importTask.href)
                    .set('Content-Type', 'application/json')
                    .auth(this._userName, this._password)
            } else {
                throw new Error(`#### GeoserverImporter#error: import task is missing`);
            }
        });
    }

    async isLayerExistsInGeoserver(layerName) {
        return request
            .get(`${this._layersPath}.json`)
            .set('Content-Type', 'application/json')
            .auth(this._userName, this._password)
            .then(response => {
                let existingLayers = _.filter(response.body.layers.layer, {name: layerName});
                return !!existingLayers.length;
            });
    }

    async getGeoserverLayers() {
        return new Promise((resolve, reject) => {
            request
                .get(`${this._layersPath}.json`)
                .set('Content-Type', 'application/json')
                .auth(this._userName, this._password)
                .then(response => {
                    return _.map(response.body.layers.layer, geoserverLayer => {
                        return geoserverLayer.name;
                    });
                })
                .then((geoserverLayers) => {
                    resolve(geoserverLayers);
                })
                .catch((error) => {
                    reject(error);
                });
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
            }).then((missingLayers) => {
                return _.map(missingLayers, (missingLayer) => {
                    return missingLayer.name;
                })
            });
    }

    removeRasterLayer(layerName) {
        return Promise.resolve().then(() => {
            return request
                .get(`${this._geoserverPath}/rest/layers/${layerName}.json`)
                .auth(this._userName, this._password)
                .then(async (response) => {
                    let layerStyleName = response.body.layer.defaultStyle.name;
                    await request
                        .delete(`${this._geoserverPath}/rest/workspaces/${this._workspace}/coveragestores/${layerName}?recurse=true&purge=all`)
                        .auth(this._userName, this._password)
                        .catch((error) => {
                            console.log(`#### GeoserverImporter#error: `, error.message);
                        });
                    await request
                        .delete(`${this._geoserverPath}/rest/styles/${layerStyleName}?recurse=true&purge=all`)
                        .auth(this._userName, this._password)
                        .catch((error) => {
                            console.log(`#### GeoserverImporter#error: `, error.message);
                        });
                })
                .catch((error) => {
                    console.log(`#### GeoserverImporter#error: `, error.message);
                });
        });
    }
}

// TODO: Store the data about the layer in the pg table for layer.

module
    .exports = GeoServerImporter;