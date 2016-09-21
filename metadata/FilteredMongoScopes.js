var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoScope = require('./MongoScope');

class FilteredMongoScopes {
	constructor(filter, connection) {
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoScope.collectionName(), MongoScope);
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoScopes;