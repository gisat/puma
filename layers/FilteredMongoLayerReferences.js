var MongoLayerReference = require('./MongoLayerReference');
var MongoFilteredCollection = require('../data/MongoFilteredCollection');

class FilteredMongoLayerReferences {
	constructor(filter, database) {
		this._connection = database;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoLayerReference.collectionName(), MongoLayerReference)
	}

	read() {
		return this._filteredCollection.read();
	}
}

module.exports = FilteredMongoLayerReferences;