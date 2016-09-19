var MongoFilteredConnection = require('../data/MongoFilteredCollection');
var MongoAttribute = require('./MongoAttribute');

class FilteredMongoAttributes {
	constructor(filter, connection) {
		this._connection = connection;
		this._filteredCollection = new MongoFilteredConnection(filter, connection, MongoAttribute.collectionName(), MongoAttribute);
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoAttributes;