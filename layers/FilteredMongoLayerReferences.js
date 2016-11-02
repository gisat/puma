var MongoLayerReference = require('./MongoLayerReference');
var MongoLayerReferences = require('./MongoLayerReferences');
var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var logger = require('../common/Logger').applicationWideLogger;

class FilteredMongoLayerReferences {
	constructor(filter, connection) {
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoLayerReference.collectionName(), MongoLayerReference);
		logger.info('FilteredMongoLayerReference#constructor filteredCollection', this._filteredCollection);
		this._layerReferences = new MongoLayerReferences(connection);
	}

	read() {
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}

	remove(layerReference) {
		this._layerReferences.remove(layerReference);
	}
}

module.exports = FilteredMongoLayerReferences;