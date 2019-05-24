var Promise = require('promise');
var FilteredMongoThemes = require('./FilteredMongoThemes');
var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
var FilteredMongoLayerTemplates = require('../layers/FilteredMongoLayerTemplates');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoTopic {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._themes = new FilteredMongoThemes({topics: {$in: [id]}}, connection);
		this._attributeSets = new FilteredMongoAttributeSets({topic: id}, connection);
		this._layerTemplates = new FilteredMongoLayerTemplates({topic: id}, connection);

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