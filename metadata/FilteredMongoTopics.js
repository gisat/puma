var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoTopic = require('./MongoTopic');

class FilteredMongoTopics {
	constructor(filter, connection) {
		this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoTopic.collectionName(), MongoTopic);
	}

	read() {
		return this._filteredCollection.read();
	}

	json() {
		return this._filteredCollection.json();
	}
}

module.exports = FilteredMongoTopics;