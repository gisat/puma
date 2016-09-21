var MongoAttributeSet = require('./MongoAttributeSet');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var Promise = require('promise');

class MongoAttributeSets {
	constructor(connection) {
		this._connection = connection;
		this._chartConfigurations = new MongoChartConfigurations(connection);
	}

	update(attributeSet) {
		return attributeSet.json().then(function(jsonAttributeSet){
			return this._connection.update({_id: jsonAttributeSet._id}, jsonAttributeSet);
		});
	}

	remove(attributeSet) {
		var self = this;
		// Remove associated layer references (layerref table)
		return attributeSet.layerReferences().then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				this._layerReferences.remove(layerReference);
			});

			return Promise.all(promises);
		}).then(function(){
			return attributeSet.id();
		}).then(function(){
			return attributeSet.chartConfigurations();
		}).then(function(chartConfigurations){
			var promises = [];

			chartConfigurations.forEach(function(chartConfiguration){
				promises.push(self._chartConfigurations.remove(chartConfiguration))
			});

			return Promise.all(analysis);
		}).then(function(id){
			var collection = self._connection.collection(MongoAttributeSet.collectionName());
			return collection.removeOne({_id: id});
		})
	}
}

module.exports = MongoAttributeSets;