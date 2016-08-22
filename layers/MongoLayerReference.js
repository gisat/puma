var logger = require('../common/Logger').applicationWideLogger;

// TODO: Mongo Layer Reference represents the information about stuff.
class MongoLayerReference {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
	}

	/**
	 * It expects layer name in the format workspace:name
	 * @returns {Request|*|Promise|Promise.<String>}
	 */
	layerName() {
		return this.load().then(function(layer){
			return layer.layer.split(':')[1];
		})
	}

	load() {
		// TODO: Move to generic. Probably a representation of the entity we will use to load the stuff.
		var self = this;
		return this._database.collection(MongoLayerReference.collectionName()).find({_id: this._id}).toArray().then(function(allReferences){
			if(!allReferences || allReferences.length == 0) {
				logger.error('MongoLayerReference#load There is no template with given id: ', self._id);
				allReferences = [null];
			} else if(allReferences.length > 1) {
				logger.warn('MongoLayerReference#load There are more templates with the same id: ', self._id);
			}
			return allReferences[0];
		}).catch(function(error){
			logger.error('MongoLayerReference#constructor Loading the instance. Error: ', error);
		});
	}

	static collectionName(){
		return 'layerref';
	}
}

module.exports = MongoLayerReference;