var FilteredMongoLayerTemplate = require('../layers/FilteredMongoLayerTemplate');

class MongoLayerGroup {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		this._layerTemplates = new FilteredMongoLayerTemplate({layerGroup: id}, connection);
	}

	layerTemplates() {
		return this._layerTemplates.read();
	}

	static collectionName() {
		return "layergroup";
	}
}

module.exports = MongoLayerGroup;