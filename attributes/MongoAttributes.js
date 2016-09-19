var MongoUniqueUpdate = require('../data/MongoUniqueUpdate');
var MongoAttribute = require('./MongoAttribute');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var MongoAttributeSets = require('./MongoAttributeSets');
var MongoAnalysis = require('../analysis/MongoAnalysis');
var Promise = require('promise');

class MongoAttributes {
	constructor(connection) {
		this._connection = connection;
		this._layerReferences = new MongoLayerReferences(connection);
		this._attributeSets = new MongoAttributeSets(connection);
		this._analysis = new MongoAnalysis(connection);
	}

	/**
	 * It removes the attribute from the store.
	 * TODO: Calc and Norm Attributes deletion should also remove analysis.
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
						new MongoUniqueUpdate(attributeSet, {remove: [{attribute: [attributeId]}]})
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
			var collection = self._connection.collection(MongoAttribute.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoAttributes;