var MongoAttributeSet = require('./MongoAttributeSet');
var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var logger = require('../common/Logger').applicationWideLogger;

class FilteredMongoAttributeSets {
	constructor(filter, connection) {
        logger.info('FilteredMongoAttributeSets#constructor filter', filter);
		this._connection = connection;
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoAttributeSet.collectionName(), MongoAttributeSet);
	}

	read() {
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}
}

module.exports = FilteredMongoAttributeSets;