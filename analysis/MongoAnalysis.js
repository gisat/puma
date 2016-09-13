var MongoAnalyse = require('./MongoAnalyse');
var MongoPerformedAnalysis = require('./MongoPerformedAnalysis');
var Promise = require('promise');

class MongoAnalysis {
	constructor(connection) {
		this._connection = connection;
		this.performedAnalysis = new MongoPerformedAnalysis(connection);
	}

	remove(analysis) {
		var self = this;
		// First delete all performed analysis.
		return analysis.performed().then(function(performed) {
			var promises = [];
			performed.forEach(function (performedAnalyse) {
				promises.push(
					self.performedAnalysis.remove(performedAnalyse)
				);
			});

			return Promise.all(promises);
		}).then(function() {
			return analysis.id();
			// Then delete the template itself.
		}).then(function(id){
			var collection = self._connection.collection(MongoAnalyse.collectionName());
			return collection.removeOne({_id: id});
		});
	}
}

module.exports = MongoAnalysis;