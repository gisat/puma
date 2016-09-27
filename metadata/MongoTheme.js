var Promise = require('promise');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoTheme {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._uniqueInstance = new MongoUniqueInstance(id, connection, MongoTheme.collectionName());
	}

	id() {
		return Promise.resolve(this._id);
	}

	json() {
		return this._uniqueInstance.read();
	}

	static collectionName() {
		return "theme";
	}
}

module.exports = MongoTheme;