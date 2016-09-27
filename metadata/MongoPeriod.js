var Promise = require('promise');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredMongoPerformedAnalysis = require('../analysis/FilteredMongoPerformedAnalysis');
var FilteredMongoThemes = require('./FilteredMongoThemes.js');
var FilteredMongoScopes = require('./FilteredMongoScopes.js');
var FilteredCompoundCollection = require('../data/FilteredCompoundCollection');
var FilteredMongoChartConfiguration = require('../visualization/FilteredMongoChartConfigurations');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoPeriod {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._layerReferences = new FilteredMongoLayerReferences({year: id}, connection);
		this._scope = new FilteredMongoScopes({years: { $in: [id]}}, connection);
		this._performedAnalysis = new FilteredMongoPerformedAnalysis({year: id}, connection);
		this._themes = new FilteredMongoThemes({years: {$in: [id]}}, connection);
		this._chartConfigurations = new FilteredCompoundCollection([
			new FilteredMongoChartConfiguration({years: {$in: [id]}}, connection),
			new FilteredMongoChartConfiguration({"attrs.normYear": id}, connection)
		]);

		this._instance = new MongoUniqueInstance(id, connection, MongoPeriod.collectionName());
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

	scope() {
		return this._scope.read();
	}

	themes() {
		return this._themes.read();
	}

	chartConfigurations() {
		return this._chartConfigurations.read();
	}

	json() {
		return this._instance.read();
	}

	static collectionName() {
		return "year";
	}
}

module.exports = MongoPeriod;