var FilteredMongoLayerTemplates = require('../layers/FilteredMongoLayerTemplates');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoLayerGroup {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		this._layerTemplates = new FilteredMongoLayerTemplates({layerGroup: id}, connection);

		this._instance = new MongoUniqueInstance(id, connection, MongoLayerGroup.collectionName());
	}

	layerTemplates() {
		return this._layerTemplates.read();
	}

	json() {
		return this._instance.read();
	}

	static collectionName() {
		return "layergroup";
	}
}

module.exports = MongoLayerGroup;