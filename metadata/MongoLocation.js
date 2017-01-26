var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredMongoPerformedAnalysis = require('../analysis/FilteredMongoPerformedAnalysis');
var FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var Promise = require('promise');

class MongoLocation {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		this._layerReferences = new FilteredMongoLayerReferences({location: id}, connection);
		this._performedAnalysis = new FilteredMongoPerformedAnalysis({location: id}, connection);
		this._dataViews = new FilteredMongoDataViews({"conf.location": id}, connection);

		this._instance = new MongoUniqueInstance(id, connection, MongoLocation.collectionName());
	}

	id() {
		return Promise.resolve(this._id);
	}

	layerReferences() {
		return this._layerReferences.read();
	}

	performedAnalysis() {
		return this._performedAnalysis.read();
	}

	dataViews() {
		return this._dataViews.read();
	}

	json() {
		return this._instance.read();
	}

	static collectionName() {
		return "location";
	}
}

module.exports = MongoLocation;