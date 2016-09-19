var MongoAnalyse = require('./MongoAnalyse');

class FilteredMongoAnalysis {
	constructor(filter, connection) {
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoAnalyse.collectionName(), MongoAnalyse);
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoAnalysis;