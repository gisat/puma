var MongoTheme = require('./MongoTheme');
var MongoDataViews = require('../visualization/MongoDataViews');
var MongoVisualizations = require('../visualization/MongoVisualization');
var Promise = require('promise');

class MongoThemes {
	constructor(connection) {
		this._connection = connection;

		this._dataViews = new MongoDataViews(connection);
		this._visualizations = new MongoVisualizations(connection);
	}

	update(theme) {
		var self = this;
		return theme.json().then(function(jsonTheme){
			var collection = self._connection.collection(MongoTheme.collectionName());
			return collection.update({_id: jsonTheme._id}, jsonTheme);
		});
	}

	remove(theme) {
		var self = this;
		return theme.dataViews().then(function(dataViews){
			var promises = [];

			dataViews.forEach(function(dataView){
				promises.push(self._dataViews.remove(dataView))
			});

			return Promise.all(promises);
		}).then(function(){
			return theme.visualizations();
		}).then(function(visualizations){
			var promises = [];

			visualizations.forEach(function(visualization){
				self._visualizations.remove(visualization);
			});

			return Promise.all(promises);
		}).then(function(){
			return theme.id();
		}).then(function(id){
			var collection = self._connection.collection(MongoTheme.collectionName());
			return collection.removeOne({_id: id});
		});
	}

	add(theme) {
		let collection = this._connection.collection(MongoTheme.collectionName());
		collection.insert(theme)
	}
}

module.exports = MongoThemes;