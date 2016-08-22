var MongoLayerReference = require('./MongoLayerReference');

class FilteredMongoLayerReferences {
	constructor(filter, database) {
		this._filter = filter;
		this._database = database;
	}

	read() {
		var self = this;
		return this._database.collection(MongoLayerReference.collectionName()).find(this._filter).toArray().then(function(jsonLayerReferences){
			var results = [];

			jsonLayerReferences.forEach(function(layerReference) {
				results.push(new MongoLayerReference(layerReference._id, self._database));
			});

			return results;
		});
	}
}

module.exports = FilteredMongoLayerReferences;