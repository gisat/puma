var MongoPerformedAnalyse = require('./MongoPerformedAnalyse');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var Promise = require('promise');

class MongoPerformedAnalysis {
	constructor(connection) {
		this._connection = connection;
		this.layerReferences = new MongoLayerReferences(connection);
	}

	remove(performedAnalysis) {
		var self = this;

		return performedAnalysis.layerReferences().then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				promises.push(
					self.layerReferences.remove(layerReference)
				);
			});

			return Promise.all(promises);
		}).then(function() {
			// Then delete the associated layerrefs. Otherwise it wont work.
			return performedAnalysis.id();
		}).then(function(id){
			var collection = self._connection.collection(MongoPerformedAnalyse.collectionName());
			return collection.removeOne({_id: id});
		});
	}

	add(performedAnalyse) {
		let collection = this._connection.collection(MongoPerformedAnalyse.collectionName());
		return collection.insert(performedAnalyse);
	}
}

module.exports = MongoPerformedAnalysis;