let superagent = require('superagent');
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

	/**
	 * Import file from local file system to geoserver
	 * @param metadata {type: "file", "format": "Shapefile|GeoTiff", file: "path-to-file", prj: "in-case-of-shape-path-to-prj", other: ["paths-to-other-additional-files]}
	 */
	importLocalFile(metadata) {
	    let payload = {
			"import": {
				"data": {
					"type": metadata.type,
					"format": metadata.format,
					"file": metadata.file,
					"prj": metadata.prj,
					"other": metadata.other
				}
			}
		};

	    if(this._workspace) {
	        payload.import.targetWorkspace = {
				"workspace": {
					"name": `${this._workspace}`
				}
			}
        }

        if(this._dataStore) {
	        payload.import.targetStore = {
				"dataStore": {
					"name": `${this._dataStore}`
				}
			}
        }

        return superagent
            .post(this._importPath)
            .set('Content-Type', 'application/json')
            .auth(this._userName, this._password)
            .send(payload)
            .then((response) => {
            	let importMeta = response.body.import;
            	let importUrl = importMeta.href;
            	if(importMeta.tasks.length && importMeta.tasks[0].state === 'READY') {
            		let layerImportUrl = importMeta.tasks[0].href;
            		return superagent
						.post(importUrl)
						.auth(this._userName, this._password)
						.send()
						.then(() => {
							return superagent
								.get(layerImportUrl)
								.auth(this._userName, this._password)
								.send()
								.then((response) => {
									return response.body.task.layer.name;
								})
								.catch(() => {
									return false;
								});
						})
						.catch(() => {
							return false;
						})
				}
            })
			.catch(() => {
				return false;
			})
	}
    
    // TODO: Configure the name of the workspace to import into.
    // TODO: Configure the name of the target data store.
    importLayer(layer) {
        let vectorDatastore = {
            dataStore: {
                name: this._dataStore
            }
        };
        
        return superagent
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
                    if (importTask.state !== "READY") {
                        allReady = !allReady;
                    }
                });
                
                if (!allReady) {
                    throw new Error(importerResponse.href);
                }

                return superagent
                    .post(importUrl)
                    .auth(this._userName, this._password)
                    .then(() => {
                        return superagent
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
                                        superagent
                                            .get(`${task.href}/layer`)
                                            .auth(this._userName, this._password)
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
}

module.exports = GeoServerImporter;