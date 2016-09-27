var MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var MongoScopes = require('./MongoScopes');
var MongoPeriod = require('./MongoPeriod');
var MongoThemes = require('./MongoThemes');
var MongoUniqueUpdate = require('../data/MongoUniqueUpdate');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var Promise = require('promise');

class MongoPeriods {
	constructor(connection) {
		this._connection = connection;

		this._performedAnalysis = new MongoPerformedAnalysis(connection);
		this._layerReferences = new MongoLayerReferences(connection);
		this._scope = new MongoScopes(connection);
		this._themes = new MongoThemes(connection);
		this._chartConfigurations = new MongoChartConfigurations(connection);
	}

	update(period) {
		return period.json().then(function(jsonPeriod){
			return this._connection.update({_id: jsonPeriod._id}, jsonPeriod);
		});
	}

	remove(period) {
		var self = this;
		var periodId;
		return period.performedAnalysis().then(function(performedAnalysis){
			var promises = [];

			performedAnalysis.forEach(function(performedAnalyse){
				promises.push(self._performedAnalysis.remove(performedAnalyse));
			});

			return Promise.all(promises);
		}).then(function(){
			return period.layerReferences();
		}).then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				promises.push(self._layerReferences.remove(layerReference));
			});

			return Promise.all(promises);
		}).then(function(){
			return period.id();
		}).then(function(id){
			periodId = id;
			return period.scope();
		}).then(function(scopes){
			var promises = [];

			scopes.forEach(function(scope){
				promises.push(
					self._scope.update(new MongoUniqueUpdate(scope, {remove: [{key: 'years', value: [periodId]}]}))
				);
			});

			return Promise.all(promises);
		}).then(function(){
			return period.chartConfigurations();
		}).then(function(chartConfigurations){
			var promises = [];

			chartConfigurations.forEach(function(chartConfiguration){
				promises.push(self._chartConfigurations.remove(chartConfiguration))
			});

			return Promise.all(promises);
		}).then(function(){
			return period.themes();
		}).then(function(themes){
			var promises = [];

			themes.forEach(function(theme){
				promises.push(
					self._themes.update(new MongoUniqueUpdate(theme, {remove: [{key: 'years', value: [periodId]}]}))
				);
			});

			return Promise.all(promises);
		}).then(function(){
			var collection = self._connection.collection(MongoPeriod.collectionName());
			return collection.removeOne({_id: periodId});
		});
	}
}

module.exports = MongoPeriods;