var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredMongoLocations = require('./FilteredMongoLocations');
var FilteredMongoThemes = require('./FilteredMongoThemes');
var FilteredMongoPerformedAnalysis = require('../analysis/FilteredMongoPerformedAnalysis');
var FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var Promise = require('promise');

// Area templates
// Theme at least remove the Scope
class MongoScope {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._layerReferences = new FilteredMongoLayerReferences({dataset: id}, connection);
		this._locations = new FilteredMongoLocations({dataset: id}, connection);
		this._themes = new FilteredMongoThemes({dataset: id}, connection);
		this._performedAnalysis = new FilteredMongoPerformedAnalysis({dataset: id}, connection);
		this._dataViews = new FilteredMongoDataViews({"conf.dataset": id}, connection);

		this._instance = new MongoUniqueInstance(id, connection, MongoScope.collectionName());
	}

	id() {
		return Promise.resolve(this._id);
	}

	layerReferences() {
		return this._layerReferences.read();
	}

	locations() {
		return this._locations.read();
	}

	themes() {
		return this._themes.read();
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

	static collectionName(){
		return "dataset";
	}
}

module.exports = MongoScope;