var Promise = require('promise');

class MongoChartConfiguration {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
	}

	id() {
		return Promise.resolve(this._id);
	}

	static collectionName() {
		return 'chartcfg';
	}
}

module.exports = MongoChartConfiguration;