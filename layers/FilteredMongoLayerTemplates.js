var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoLayerTemplate = require('./MongoLayerTemplate');

class FilteredMongoLayerTemplates {
	constructor(filter, connection) {
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoLayerTemplate.collectionName(), MongoLayerTemplate)
	}

	read() {
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}
}

module.exports = FilteredMongoLayerTemplates;