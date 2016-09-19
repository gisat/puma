var Promise = require('promise');
var FilteredMongoPeriods = require('./FilteredMongoPeriods');
var FilteredMongoTopics = require('./FilteredMongoTopics');
var FilteredMongoScopes = require('./FilteredMongoScopes');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoTheme {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;

		this._uniqueInstance = new MongoUniqueInstance(id, connection, MongoTheme.collectionName());
	}

	id() {
		return Promise.resolve(this._id);
	}

	periodIds() {
		return this._uniqueInstance.read().then(function(jsonTheme){
			return jsonTheme.years;
		});
	}

	periods() {
		var self = this;
		return this.periodIds().then(function(ids){
			var periods = [];

			ids.forEach(function(id){
				periods.push(
					new FilteredMongoPeriods({_id: id}, self._connection).read()
				);
			});

			return Promise.all(periods);
		});
	}

	topicIds() {
		return this._uniqueInstance.read().then(function(jsonTheme){
			return jsonTheme.topics;
		});
	}

	topics() {
		var self = this;
		return this.topicIds().then(function(ids){
			var topics = [];

			ids.forEach(function(id){
				topics.push(
					new FilteredMongoTopics({_id: id}, self._connection).read()
				);
			});

			return Promise.all(topics);
		});
	}

	scopeId() {
		return this._uniqueInstance.read().then(function(jsonTheme){
			return jsonTheme.dataset;
		});
	}

	scope() {
		var self = this;
		return this.scopeId().then(function(id){
			return new FilteredMongoScopes({_id: id}, self._connection).read();
		});
	}

	static collectionName() {
		return "theme";
	}
}

module.exports = MongoTheme;