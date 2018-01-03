var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoPeriod = require('./MongoPeriod');

class FilteredMongoPeriods {
	constructor(filter, connection) {
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoPeriod.collectionName(), MongoPeriod);
	}

	read(){
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}
}

module.exports = FilteredMongoPeriods;