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
		var self = this;
		return scope.json().then(function(jsonScope){
			var collection = self._connection.collection(MongoScope.collectionName());
			return collection.update({_id: jsonScope._id}, jsonScope);
		});
	}

	remove(scope) {
		var self = this;
		return scope.locations().then(function(locations){
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