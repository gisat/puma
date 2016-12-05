var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoLocation = require('./MongoLocation');

class FilteredMongoLocations {
	constructor(filter, connection) {
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoLocation.collectionName(), MongoLocation);
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoLocations;