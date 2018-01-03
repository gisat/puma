var MongoChartConfiguration = require('./MongoChartConfiguration');

class MongoChartConfigurations {
	constructor(connection) {
		this._connection = connection;
	}

	remove(chartConfiguration){
		return chartConfiguration.id().then(function(id){
			var collection = this._connection.collection(MongoChartConfiguration.collectionName());
			return collection.removeOne({_id: id});
		});
	}

	add(chartConfiguration) {
		var self = this;
		return chartConfiguration.json().then(function(chartConfiguration){
			var collection = self._connection.collection(MongoChartConfiguration.collectionName());
			collection.insert(chartConfiguration)
		});
	}

}

module.exports = MongoChartConfigurations;