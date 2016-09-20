var FilteredMongoPerformedAnalysis = require('./FilteredMongoPerformedAnalysis');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

class MongoAnalyse {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		this._mongoInstance = new MongoUniqueInstance(id, connection, MongoAnalyse.collectionName());

		this._performedAnalysis = new FilteredMongoPerformedAnalysis({analysis: id}, connection);
		this._layerReferences = new FilteredMongoLayerReferences({analysis: id}, connection);
	}

	id() {
		return Promise.resolve(this._id);
	}

	performed() {
		return this._performedAnalysis.read();
	}

	layerReferences() {
		return this._layerReferences.read();
	}

	load() {
		return this._mongoInstance.read();
	}

	type() {
		return this.load().then(function(instance){
			return instance.type;
		});
	}

	static collectionName() {
		return 'analysis';
	}
}

module.exports = MongoAnalyse;