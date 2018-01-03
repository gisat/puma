let superagent = require('superagent');
let Promise = require('promise');

let logger = require('../common/Logger').applicationWideLogger;

let FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');

/**
 * Class representing layers stored in the geonode.
 */
class GeonodeLayers {
	constructor(sessionId, url, mongo){
		this._sessionId = sessionId;
		this._url = url;
		this._mongo = mongo;
	}

	/**
	 * It returns all layers from the geonode to which the current user has read and write access.
	 */
	all() {
		logger.info(`GeonodeLayers#all SessionId: ${this._sessionId}, URL: ${this._url}`);
		return superagent
			.get(`${this._url}layers/acls`)
			.set('Cookie', `sessionid=${this._sessionId}`)
			.then(response => {
				return Promise.all(response.body.rw.map(layer => {
					return new FilteredMongoLayerReferences({layer: layer}, this._mongo).json().then(layerReferences => {
						return {
							name: layer,
							path: layer,
							referenced: layerReferences.length > 0,
							source: 'geonode'
						};
					});
				}));
		});
	}
}

module.exports = GeonodeLayers;