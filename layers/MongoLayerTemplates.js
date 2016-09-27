var Promise = require('promise');

var MongoAnalysis = require('../analysis/MongoAnalysis');
var MongoAttributeSets = require('../attributes/MongoAttributeSets');
var MongoUniqueUpdate = require('../data/MongoUniqueUpdate');
var MongoScopes = require('../metadata/MongoScopes');
var MongoLayerReferences = require('./MongoLayerReferences');
var MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var MongoLayerTemplate = require('./MongoLayerTemplate');

class MongoLayerTemplates {
	constructor(connection) {
		this._connection = connection;

		this._analysis = new MongoAnalysis(connection);
		this._attributeSets = new MongoAttributeSets(connection);
		this._scopes = new MongoScopes(connection);
		this._layerReferences = new MongoLayerReferences(connection);
		this._performedAnalysis = new MongoPerformedAnalysis(connection);
		this._chartConfigurations = new MongoChartConfigurations(connection);
	}

	update(layerTemplate) {
		return layerTemplate.json().then(function(layerTemplate){
			return this._connection.update({_id: layerTemplate._id}, layerTemplate);
		});
	}

	// TODO: How does removal of level from the scope which isn't last, influences the rest. It is possible to remove only from last one.
	remove(layerTemplate) {
		var templateId, self = this;
		return layerTemplate.id().then(function(id){
			templateId = id;
			return layerTemplate.analysis();
		}).then(function(analysis){
			var promises = [];

			analysis.forEach(function(analyse){
				self._analysis.remove(analyse);
			});

			return Promise.all(promises);
		}).then(function(){
			return layerTemplate.attributeSets();
		}).then(function(attributeSets){
			var promises = [];

			attributeSets.forEach(function(attributeSet){
				self._attributeSets.update(new MongoUniqueUpdate(attributeSet, {remove: [{key: "featureLayers", value: [templateId]}]}))
			});

			return Promise.all(promises);
		}).then(function(){
			return layerTemplate.scopes();
		}).then(function(scopes){
			var promises = [];

			scopes.forEach(function(scope){
				self._scopes.update(new MongoUniqueUpdate(scope, {remove: [{key: "featureLayers", value: [templateId]}]}))
			});

			return Promise.all(promises);
		}).then(function(){
			return layerTemplate.layerReferences();
		}).then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				self._layerReferences.remove(layerReference);
			});

			return Promise.all(promises);
		}).then(function(){
			return layerTemplate.performedAnalysis();
		}).then(function(performedAnalysis){
			var promises = [];

			performedAnalysis.forEach(function(performedAnalyse){
				self._performedAnalysis.remove(performedAnalyse);
			});

			return Promise.all(promises);
		}).then(function(){
			return layerTemplate.chartConfigurations();
		}).then(function(chartConfigurations){
			var promises = [];

			chartConfigurations.forEach(function(chartConfiguration){
				self._chartConfigurations.remove(chartConfiguration);
			});

			return Promise.all(promises);
		}).then(function(){
			var collection = self._connection.collection(MongoLayerTemplate.collectionName());
			return collection.removeOne({_id: templateId});
		});
	}
}

module.exports = MongoLayerTemplates;