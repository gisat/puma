var MongoAttributeSet = require('./MongoAttributeSet');
var MongoFilteredCollection = require('../data/MongoFilteredCollection');

class FilteredMongoAttributeSets {
	constructor(filter, connection) {
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoAttributeSet.collectionName(), MongoAttributeSet);
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoAttributeSets;