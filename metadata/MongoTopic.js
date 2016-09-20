var Promise = require('promise');
var FilteredMongoThemes = require('./FilteredMongoThemes');
var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
var FilteredMongoChartConfiguration = require('../visualization/FilteredMongoChartConfigurations');

class MongoTopic {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._themes = new FilteredMongoThemes({topics: {$in: [id]}}, connection);
		this._attributeSets = new FilteredMongoAttributeSets({topic: id}, connection);
		this._chartConfigurations = new FilteredMongoChartConfiguration({"attrs.topic": id}, connection);
	}

	id() {
		return Promise.resolve(this._id);
	}

	themes() {
		return this._themes.read();
	}

	attributeSets() {
		return this._attributeSets.read();
	}

	chartConfigurations() {
		return this._chartConfigurations.read();
	}

	static collectionName() {
		return "topic";
	}
}

module.exports = MongoTopic;