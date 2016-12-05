var MongoAttributeSet = require('./MongoAttributeSet');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var MongoDataViews = require('../visualization/MongoDataViews');
var MongoAnalysis = require('../analysis/MongoAnalysis');
var MongoVisualizations = require('../visualization/MongoVisualization');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var Promise = require('promise');

class MongoAttributeSets {
	constructor(connection) {
		this._connection = connection;
		this._chartConfigurations = new MongoChartConfigurations(connection);
		this._dataViews = new MongoDataViews(connection);
		this._visualizations = new MongoVisualizations(connection);
		this._analysis = new MongoAnalysis(connection);
		this._layerReferences = new MongoLayerReferences(connection);
	}

	update(attributeSet) {
		var self = this;
		return attributeSet.json().then(function(jsonAttributeSet){
			var collection = self._connection.collection(MongoAttributeSet.collectionName());
			return collection.update({_id: jsonAttributeSet._id}, jsonAttributeSet);
		});
	}

	// TODO: Remove analysis with given attribute set, Math - remove when any, Spatial - remove all, Level Analysis - update by removing attribute set. When none remaining delete.
	remove(attributeSet) {
		var self = this;
		// Remove associated layer references (layerref table)
		return attributeSet.layerReferences().then(layerReferences => {
			var promises = [];

			layerReferences.forEach(layerReference => {
				this._layerReferences.remove(layerReference);
			});

			return Promise.all(promises);
		}).then(function(){
			return attributeSet.chartConfigurations();
		}).then(function(chartConfigurations){
			var promises = [];

			chartConfigurations.forEach(function(chartConfiguration){
				promises.push(self._chartConfigurations.remove(chartConfiguration))
			});

			return Promise.all(promises);
		}).then(function(){
			return attributeSet.analysis();
		}).then(function(analysis){
			var promises = [];

			analysis.forEach(function(analyse){
				promises.push(self._analysis.remove(analyse))
			});

			return Promise.all(analysis);
		}).then(function(){
			return attributeSet.dataViews();
		}).then(function(dataViews){
			var promises = [];

			dataViews.forEach(function(dataView){
				promises.push(self._dataViews.remove(dataView))
			});

			return Promise.all(promises);
		}).then(function(){
			return attributeSet.visualizations();
		}).then(function(visualizations){
			var promises = [];

			visualizations.forEach(function(visualization){
				self._visualizations.remove(visualization);
			});

			return Promise.all(promises);
		}).then(function(){
			return attributeSet.id();
		}).then(function(id){
			var collection = self._connection.collection(MongoAttributeSet.collectionName());
			return collection.removeOne({_id: id});
		})
	}

	add(attributeSet) {
		var self = this;
		return attributeSet.json().then(function(atrtibuteSet){
			var collection = self._connection.collection(MongoAttributeSet.collectionName());
			collection.insert(atrtibuteSet)
		});
	}
}

module.exports = MongoAttributeSets;