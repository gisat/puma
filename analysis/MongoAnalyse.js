var FilteredMongoPerformedAnalysis = require('./FilteredMongoPerformedAnalysis');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

class MongoAnalyse {
	constructor(id, connection) {
		this._connection = connection;
		this._performedAnalysis = new FilteredMongoPerformedAnalysis({analysis: id}, connection);
		this._id = id;
	}

	id() {
		return Promise.resolve(this._id);
	}

	performed() {
		return this._performedAnalysis.read();
	}

	load() {
		var self = this;
		return this._database.collection(MongoAnalyse.collectionName()).find({_id: this._id}).toArray().then(function(analysis){
			if(!analysis || analysis.length == 0) {
				logger.error('MongoAnalyse#load There is no analysis with given id: ', self._id);
				analysis = [null];
			} else if(analysis.length > 1) {
				logger.warn('MongoAnalyse#load There are more analysis with the same id: ', self._id);
			}
			return analysis[0];
		}).catch(function(error){
			logger.error('MongoAnalyse#constructor Loading the instance. Error: ', error);
		});
	}

	static collectionName() {
		return 'analysis';
	}
}

module.exports = MongoAnalyse;