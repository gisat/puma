var MongoPerformedAnalyse = require('./MongoPerformedAnalyse');

class FilteredMongoPerformedAnalysis {
	constructor(filter, database) {
		this._filter = filter;
		this._database = database;
	}

	read() {
		var self = this;
		return this._database.collection(MongoPerformedAnalyse.collectionName()).find(this._filter).toArray().then(function(jsonLayerReferences){
			var results = [];

			jsonLayerReferences.forEach(function(layerReference) {
				results.push(new MongoPerformedAnalyse(layerReference._id, self._database));
			});

			return results;
		});
	}
}

module.exports = FilteredMongoPerformedAnalysis;