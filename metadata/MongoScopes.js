var MongoLayerReferences = require('../layers/MongoLayerReferences');
var MongoLocations = require('./MongoLocations');
var MongoThemes = require('./MongoThemes');
var MongoScope = require('./MongoScope');
var Promise = require('promise');

class MongoScopes {
	constructor(connection) {
		this._connection = connection;

		this._layerReferences = new MongoLayerReferences(connection);
		this._locations = new MongoLocations(connection);
		this._themes = new MongoThemes(connection);
	}

	update(scope) {
		return scope.json().then(function(jsonScope){
			return this._connection.update({_id: jsonScope._id}, jsonScope);
		});
	}

	remove(scope) {
		var self = this;
		return scope.layerReferences().then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				promises.push(
					self._layerReferences.remove(layerReference)
				);
			});

			return Promise.all(promises);
		}).then(function(){
			return scope.locations();
		}).then(function(locations){
			var promises = [];

			locations.forEach(function(location){
				promises.push(
					self._locations.remove(location)
				);
			});

			return Promise.all(promises);
		}).then(function(){
			return scope.themes();
		}).then(function(themes){
			var promises = [];

			themes.forEach(function(theme){
				promises.push(
					self._themes.remove(theme)
				)
			});

			return Promise.all(promises);
		}).then(function(){
			return scope.id();
		}).then(function(id){
			var collection = self._connection.collection(MongoScope.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoScopes;