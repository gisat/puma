var FilteredMongoPerformedAnalysis = require('./FilteredMongoPerformedAnalysis');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

class MongoAnalyse {
	constructor(id, connection) {
		this._connection = connection;
		this._performedAnalysis = new FilteredMongoPerformedAnalysis({analysis: id}, connection);
		this._mongoInstance = new MongoUniqueInstance(id, connection, MongoAnalyse.collectionName());
		this._id = id;
	}

	id() {
		return Promise.resolve(this._id);
	}

	performed() {
		return this._performedAnalysis.read();
	}

	load() {
		return this._mongoInstance.read();
	}

	static collectionName() {
		return 'analysis';
	}
}

module.exports = MongoAnalyse;