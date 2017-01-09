var MongoAnalyse = require('./MongoAnalyse');
var MongoFilteredCollection = require('../data/MongoFilteredCollection');

class FilteredMongoAnalysis {
	constructor(filter, connection) {
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoAnalyse.collectionName(), MongoAnalyse);
	}

	read() {
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}
}

module.exports = FilteredMongoAnalysis;