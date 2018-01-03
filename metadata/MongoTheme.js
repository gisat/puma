var Promise = require('promise');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
var FilteredMongoVisualizations = require('../visualization/FilteredMongoVisualizations');

class MongoTheme {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._dataViews = new FilteredMongoDataViews({"conf.theme": id}, connection);
		this._visualizations = new FilteredMongoVisualizations({"theme": id}, connection);

		this._uniqueInstance = new MongoUniqueInstance(id, connection, MongoTheme.collectionName());
	}

	id() {
		return Promise.resolve(this._id);
	}

	json() {
		return this._uniqueInstance.read();
	}

	dataViews() {
		return this._dataViews.read();
	}

	visualizations() {
		return this._visualizations.read();
	}

	static collectionName() {
		return "theme";
	}
}

module.exports = MongoTheme;