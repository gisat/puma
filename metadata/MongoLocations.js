var MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var MongoLocation = require('./MongoLocation');
var Promise = require('promise');

class MongoLocations {
	constructor(connection) {
		this._connection = connection;

		this._performedAnalysis = new MongoPerformedAnalysis(connection);
		this._layerReferences = new MongoLayerReferences(connection);
	}

	update(location) {
		var self = this;
		return location.json().then(function(jsonLocation){
			var collection = self._connection.collection(MongoLocation.collectionName());
			return collection.update({_id: jsonLocation._id}, jsonLocation);
		});
	}

	// TODO: Find a way to remove the entity with associated entities.
	remove(location) {
		var self = this;
		return location.performedAnalysis().then(function(performedAnalysis){
			var promises = [];

			performedAnalysis.forEach(function(performedAnalyse){
				promises.push(self._performedAnalysis.remove(performedAnalyse));
			});

			Promise.all(promises);
		}).then(function(){
			return location.layerReferences();
		}).then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				promises.push(self._layerReferences.remove(layerReference));
			});

			Promise.all(promises);
		}).then(function(){
			return location.id();
		}).then(function(id){
			var collection = self._connection.collection(MongoLocation.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoLocations;