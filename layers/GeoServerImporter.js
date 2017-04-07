let request = require('superagent');

/**
 * This class handles layers to be imported into the GeoServer.
 */
class GeoServerImporter {
	constructor(geoServerPath, userName, password, workspace, dataStore) {
		this._importPath = geoServerPath + 'rest/imports';

		this._userName = userName;
		this._password = password;
		this._workspace = workspace;
		this._dataStore = dataStore;
	}

	// TODO: Configure the name of the workspace to import into.
	// TODO: Configure the name of the target data store.
	importLayer(file) {
		let id;

		return request
			.post(this._importPath)
			.set('Content-Type', 'application/json')
			.auth(this._userName, this._password)
			.send({
				"import": {
					"targetWorkspace": {
						"workspace": {
							"name": this._workspace
						}
					},
					"targetStore": {
						"dataStore": {
							"name": this._dataStore
						}
					}
				}
			}).then(response => {
				id = response.body.import.id;
				return request
					.post(`${this._importPath}/${id}/tasks`)
					.auth(this._userName, this._password)
					.attach(file.name, file.path)
			}).then(() => {
				return request
					.put(`${this._importPath}/${id}/tasks/0/target`)
					.set('Content-Type', 'application/json')
					.auth(this._userName, this._password)
					.send({
						"dataStore": {
							"name": this._dataStore
						}
					})
			}).then(() => {
				return request
					.post(`${this._importPath}/${id}`)
					.auth(this._userName, this._password)
			});
	}
}
// TODO: Store the data about the layer in the pg table for layer.

module.exports = GeoServerImporter;