var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var Promise = require('promise');

class MongoPerformedAnalyse {
	constructor(id, connection) {
		this._connection = connection;
		this._id = id;
		this._associatedLayers = new FilteredMongoLayerReferences({analysis: id}, connection);
		this._mongoInstance = new MongoUniqueInstance(id, connection, MongoPerformedAnalyse.collectionName())
	}

	id() {
		Promise.resolve(this._id);
	}

	layerReferences() {
		return this._associatedLayers.read();
	}

	load() {
		return this._mongoInstance.read();
	}

	static collectionName() {
		return 'performedanalysis';
	}
}

module.exports = MongoPerformedAnalyse;