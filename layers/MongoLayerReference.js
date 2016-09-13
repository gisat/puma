var MongoUniqueInstance = require('../data/MongoUniqueInstance');

// TODO: Mongo Layer Reference represents the information about stuff.
class MongoLayerReference {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
		this._mongoInstance = new MongoUniqueInstance(id, connection, name);
	}

	/**
	 * It expects layer name in the format workspace:name
	 * @returns {Request|*|Promise|Promise.<String>}
	 */
	layerName() {
		return this.load().then(function(layer){
			return layer.layer.split(':')[1];
		})
	}

	load() {
		return this._mongoInstance.read();
	}

	static collectionName(){
		return 'layerref';
	}
}

module.exports = MongoLayerReference;