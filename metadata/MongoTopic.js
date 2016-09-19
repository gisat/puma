var Promise = require('promise');
var FilteredMongoThemes = require('./FilteredMongoThemes');
var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');

class MongoTopic {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._themes = new FilteredMongoThemes({topics: {$in: [id]}}, connection);
		this._attributeSets = new FilteredMongoAttributeSets({topic: id}, connection);
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

	static collectionName() {
		return "topic";
	}
}

mongo.exports = MongoTopic;