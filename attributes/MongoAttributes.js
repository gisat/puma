var MongoUniqueUpdate = require('../data/MongoUniqueUpdate');
var MongoAttribute = require('./MongoAttribute');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var MongoAttributeSets = require('./MongoAttributeSets');
var MongoAnalysis = require('../analysis/MongoAnalysis');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var Promise = require('promise');

class MongoAttributes {
	constructor(connection) {
		this._connection = connection;
		this._layerReferences = new MongoLayerReferences(connection);
		this._attributeSets = new MongoAttributeSets(connection);
		this._analysis = new MongoAnalysis(connection);
		this._chartConfigurations = new MongoChartConfigurations(connection);
	}

	/**
	 * It removes the attribute from the store.
	 * TODO: Calc and Norm Attributes deletion should also remove analysis.
	 * TODO: Updating of attribute set must also to some extent cascade
	 * @param attribute {MongoAttribute}
	 */
	remove(attribute) {
		var attributeId;
		var self = this;
		return attribute.id().then(function(id){
			attributeId = id;
			return attribute.attributeSets()
		}).then(function(attributeSets){
			var promises = [];

			attributeSets.forEach(function(attributeSet){
				promises.push(
					self._attributeSets.update(
						new MongoUniqueUpdate(attributeSet, {remove: [{key: 'attribute', value: [attributeId]}]})
					)
				);
			});

			return Promise.all(promises);
		}).then(function(){
			return attribute.layerReferences();
		}).then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				self._layerReferences.remove(layerReference);
			});

			return Promise.all(promises);
		}).then(function(){
			return attribute.analysis();
		}).then(function(analysis){
			var promises = [];

			analysis.forEach(function(analyse){
				promises.push(self._analysis.remove(analyse))
			});

			return Promise.all(analysis);
		}).then(function(){
			return attribute.chartConfigurations();
		}).then(function(chartConfigurations){
			var promises = [];

			chartConfigurations.forEach(function(chartConfiguration){
				promises.push(self._chartConfigurations.remove(chartConfiguration))
			});

			return Promise.all(promises);
		}).then(function(){
			var collection = self._connection.collection(MongoAttribute.collectionName());
			return collection.removeOne({_id: attributeId});
		});
	}
}

module.exports = MongoAttributes;