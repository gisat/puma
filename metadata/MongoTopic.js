var Promise = require('promise');
var FilteredMongoThemes = require('./FilteredMongoThemes');
var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
var FilteredMongoChartConfiguration = require('../visualization/FilteredMongoChartConfigurations');
var FilteredMongoLayerTemplate = require('../layers/FilteredMongoLayerTemplate');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoTopic {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._themes = new FilteredMongoThemes({topics: {$in: [id]}}, connection);
		this._attributeSets = new FilteredMongoAttributeSets({topic: id}, connection);
		this._chartConfigurations = new FilteredMongoChartConfiguration({"attrs.topic": id}, connection);
		this._layerTemplates = new FilteredMongoLayerTemplate({topic: id}, connection);

		this._instance = new MongoUniqueInstance(id, connection, MongoTopic.collectionName());
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

	layerTemplates() {
		return this._layerTemplates.read();
	}

	json() {
		return this._instance.read();
	}

	static collectionName() {
		return "topic";
	}
}

module.exports = MongoTopic;