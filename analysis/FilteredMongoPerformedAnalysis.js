var MongoPerformedAnalyse = require('./MongoPerformedAnalyse');
var MongoFilteredCollection = require('../data/MongoFilteredCollection');

class FilteredMongoPerformedAnalysis {
	constructor(filter, connection) {
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection. MongoPerformedAnalyse.collectionName(), MongoPerformedAnalyse);
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoPerformedAnalysis;