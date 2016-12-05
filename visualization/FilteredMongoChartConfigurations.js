var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoChartConfiguration = require('./MongoChartConfiguration');

class FilteredMongoChartConfigurations {
	constructor(filter, connection) {
		this._connection = connection;

		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoChartConfiguration.collectionName(), MongoChartConfiguration);
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoChartConfigurations;