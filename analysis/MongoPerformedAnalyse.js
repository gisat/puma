var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

class MongoPerformedAnalyse {
	constructor(id, connection) {
		this._connection = connection;
		this._id = id;
		this._associatedLayers = new FilteredMongoLayerReferences({analysis: id}, connection);
	}

	id() {
		Promise.resolve(this._id);
	}

	layerReferences() {
		return this._associatedLayers.read();
	}

	load() {
		var self = this;
		return this._database.collection(MongoPerformedAnalyse.collectionName()).find({_id: this._id}).toArray().then(function(performedAnalysis){
			if(!performedAnalysis || performedAnalysis.length == 0) {
				logger.error('MongoPerformedAnalyse#load There is no performed analysis with given id: ', self._id);
				performedAnalysis = [null];
			} else if(performedAnalysis.length > 1) {
				logger.warn('MongoLayerReference#load There are more performed analysis with the same id: ', self._id);
			}
			return performedAnalysis[0];
		}).catch(function(error){
			logger.error('MongoLayerReference#constructor Loading the instance. Error: ', error);
		});
	}

	static collectionName() {
		return 'performedanalysis';
	}
}

module.exports = MongoPerformedAnalyse;