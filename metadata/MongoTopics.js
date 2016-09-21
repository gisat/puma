var MongoTopic = require('../metadata/MongoTopic');
var MongoThemes = require('../metadata/MongoThemes');
var MongoAttributeSets = require('../attributes/MongoAttributeSets');
var MongoChartConfigurations = require('../visualization/MongoChartConfigurations');
var Promise = require('promise');

class MongoTopics {
	constructor(connection) {
		this._connection = connection;

		this._themes = new MongoThemes(connection);
		this._attributeSets = new MongoAttributeSets(connection);
		this._chartConfigurations = new MongoChartConfigurations(connection);
	}

	remove(topic) {
		var self = this;
		var topicId;
		return topic.id().then(function(id){
			topicId = id;
			return topic.themes();
		}).then(function(themes){
			var promises = [];

			themes.forEach(function(theme){
				promises.push(
					self._themes.update(
						new MongoUniqueUpdate(theme, {remove: [{topic: [topicId]}]})
					)
				);
			});

			return Promise.all(promises);
		}).then(function(){
			return topic.attributeSets();
		}).then(function(attributeSets){
			var promises = [];

			attributeSets.forEach(function(attributeSet){
				promises.push(
					self._attributeSets.update(
						new MongoUniqueUpdate(attributeSet, {remove: [{topic: [topicId]}]})
					)
				);
			});

			return Promise.all(promises);
		}).then(function(){
			return topic.chartConfigurations();
		}).then(function(chartConfigurations){
			var promises = [];

			chartConfigurations.forEach(function(chartConfiguration){
				promises.push(self._chartConfigurations.remove(chartConfiguration))
			});

			return Promise.all(analysis);
		}).then(function(){
			var collection = self._connection.collection(MongoTopic.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoTopics;