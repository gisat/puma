var MongoLayerGroup = require('./MongoLayerGroup');
var MongoLayerGroups = require('./MongoLayerGroups');
var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var logger = require('../common/Logger').applicationWideLogger;

class FilteredMongoLayerGroups {
	constructor(filter, connection) {
		logger.info('FilteredMongoLayerGroups#constructor filter', filter);
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoLayerGroup.collectionName(), MongoLayerGroup);
		this._layerGroups = new MongoLayerGroups(connection);
	}

	read() {
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}

	remove(layerReference) {
		this._layerGroups.remove(layerReference);
	}
}

module.exports = FilteredMongoLayerGroups;