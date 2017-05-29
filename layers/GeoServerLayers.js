var superagent = require('superagent');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * It represents a Layer as perceived by the GeoServer.
 * @alias GeoServerLayer
 */
class GeoServerLayers {
	/**
	 * @param url {String} Url of the geoserver
	 * @param userName {String} User name of user existing in the geoserver with rights to create feature type in the geoserver
	 * @param password {String} Password to log into the geoserver
	 */
	constructor(url, userName, password) {
		this._url = url;
		this._userName = userName;
		this._password = password;
	}

	create(layer) {
		var self = this;
		return this.getNames(layer).then(function (names) {
			let data = {
				featureType: {
					name: names.layerName,
					nativeName: names.layerName,
					title: names.layerName,
					enabled: true
				}
			};
			logger.info(`GeoServerLayers#create Data: `, data);
			return superagent
				.post(self._url + '/rest/workspaces/' + names.workspaceName + '/datastores/' + names.dataStoreName + '/featuretypes')
				.auth(self._userName, self._password)
				.set('Accept', '*/*')
				.set('Content-Type', 'application/json; charset=utf-8')
				.send(data)
		});
	}

	remove(layer) {
		var self = this;
		return this.getNames(layer).then(function (names) {
			return superagent
				.delete(self._url + '/rest/workspaces/' + names.workspaceName + '/datastores/' + names.dataStoreName + '/featuretypes/' + names.layerName)
				.auth(self._userName, self._password)
				.set('Accept', '*/*')
				.set('Content-Type', 'application/json; charset=utf-8')
				.send()
		});
	}

	/**
	 * @private
	 * @param layer {RestLayer}
	 * @returns {Promise.<Object>}
	 */
	getNames(layer) {
		var workspaceName, dataStoreName;

		return layer.workspace().then(function (workspace) {
			return workspace.name();
		}).then(function (name) {
			workspaceName = name;
			return layer.dataStore();
		}).then(function (dataStore) {
			return dataStore.name();
		}).then(function (name) {
			dataStoreName = name;
			return layer.name();
		}).then(function (layerName) {
			let result = {
				workspaceName: workspaceName,
				dataStoreName: dataStoreName,
				layerName: layerName
			};
			logger.info(`GeoServerLayers#getNames Results: `, result);
			return result;
		}).catch(function (error) {
			throw new Error(
				logger.error('GeoServerLayers#getNames Error: ', error)
			);
		});
	}
}

module.exports = GeoServerLayers;