var Promise = require('promise');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoChartConfiguration {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._instance = new MongoUniqueInstance(id, connection, MongoChartConfiguration.collectionName());
	}

	id() {
		return Promise.resolve(this._id);
	}

	json() {
		return this._instance.read();
	}

	static collectionName() {
		return 'chartcfg';
	}
}

module.exports = MongoChartConfiguration;