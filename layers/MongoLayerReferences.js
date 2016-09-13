var MongoLayerReference = require('./MongoLayerReference');

class MongoLayerReferences {
	constructor(connection) {
		this._connection = connection;
	}

	remove(layerReference) {
		var self = this;
		return layerReference.id().then(function(id){
			var collection = self._connection.collection(MongoLayerReference.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoLayerReferences;