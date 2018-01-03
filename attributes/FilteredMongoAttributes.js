let MongoFilteredConnection = require('../data/MongoFilteredCollection');
let MongoAttribute = require('../attributes/MongoAttribute');

class FilteredMongoAttributes {
	constructor(filter, connection) {
		this._connection = connection;
		// TODO: Find better solution for the name.
		this._filteredCollection = new MongoFilteredConnection(filter, connection, 'attribute', MongoAttribute);
	}

	read() {
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}
}

module.exports = FilteredMongoAttributes;