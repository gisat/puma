var MongoUniqueUpdate = require('../data/MongoUniqueUpdate');
var MongoLayerTemplates = require('./MongoLayerTemplates');
var MongoLayerGroup = require('./MongoLayerGroup');
var Promise = require('promise');

class MongoLayerGroups {
	constructor(connection) {
		this._connection = connection;

		this._layerTemplates = new MongoLayerTemplates(connection);
	}

	remove(layerGroup) {
		var groupId;
		var self = this;
		return layerGroup.id().then(function(id){
			groupId = id;
			return layerGroup.layerTemplates();
		}).then(function(layerTemplates){
			var promises = [];

			layerTemplates.forEach(function(layerTemplate){
				self._layerTemplates.update(
					new MongoUniqueUpdate(layerTemplate, {
						remove: [{'layerGroup'}]
					})
				)
			});

			return Promise.all(promises);
		}).then(function(){
			var collection = self._connection.collection(MongoLayerGroup.collectionName());
			return collection.removeOne({_id: groupId});
		});
	}
}

module.exports = MongoLayerGroups;