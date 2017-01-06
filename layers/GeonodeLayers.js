let superagent = require('superagent');
let Promise = require('promise');

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
		return superagent
			.get(`${this._url}layers/acls`)
			.set('Cookie', `sessionid=${this._sessionId}`)
			.then(response => {
				return Promise.all(response.body.rw.map(layer => {
					return new FilteredMongoLayerReferences({layer: layer}, this._mongo).json().then(layerReferences => {
						return {
							name: layer,
							referenced: layerReferences.length > 0
						};
					});
				}));
		});
	}
}

module.exports = GeonodeLayers;