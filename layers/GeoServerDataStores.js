var superagent = require('superagent');
var Promise = require('promise');

/**
 * Class handling operations related to the DataStores in the GeoServer
 * @alias GeoServerDataStores
 */
class GeoServerDataStores {
	constructor(url, userName, password) {
		this._url = url;
		this._userName = userName;
		this._password = password;
	}

	/**
	 * It creates data store in the GeoServer.
	 * @param dataStore {GeoServerDataStore} Data store to create.
	 */
	create(dataStore) {
		var self = this;
		return dataStore.workspace().then(function(workspace){
			return Promise.all([dataStore.name(), dataStore.connectionParameters(), workspace.name()])
		}).then(function(results){
			return superagent
				.post(self._url + '/rest/workspaces/' + results[2] + '/datastores')
				.auth(self._userName, self._password)
				.set('Accept', '*/*')
				.set('Content-Type', 'application/json; charset=utf-8')
				.send({
					dataStore: {
						name: results[0],
						connectionParameters: results[1]
					}
				})
		});
	}

	/**
	 * It removes data store with given name from the workspace.
	 * @param workspaceName {String} Name representing the workspace on the geoserver
	 * @param dataStoreName {String} Name representing the data store on the geoserver
	 */
	remove(workspaceName, dataStoreName) {
		return superagent
			.delete(this._url + '/rest/workspaces/' + workspaceName + '/datastores/' + dataStoreName)
			.auth(this._userName, this._password)
			.set('Accept', '*/*')
			.set('Content-Type', 'application/json; charset=utf-8')
			.send()
	}
}

module.exports = GeoServerDataStores;