var MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var MongoLocation = require('./MongoLocation');
var MongoDataViews = require('../visualization/MongoDataViews');
var Promise = require('promise');

class MongoLocations {
	constructor(connection) {
		this._connection = connection;

		this._performedAnalysis = new MongoPerformedAnalysis(connection);
		this._layerReferences = new MongoLayerReferences(connection);
		this._dataViews = new MongoDataViews(connection);
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
			return location.dataViews();
		}).then(function(dataViews){
			var promises = [];

			dataViews.forEach(function(dataView){
				promises.push(self._dataViews.remove(dataView))
			});

			return Promise.all(promises);
		}).then(function(){
			return location.id();
		}).then(function(id){
			var collection = self._connection.collection(MongoLocation.collectionName());
			return collection.removeOne({_id: id});
		});
	}

	add(location) {
		let collection = this._connection.collection(MongoLocation.collectionName());
		collection.insert(location)
	}
}

module.exports = MongoLocations;