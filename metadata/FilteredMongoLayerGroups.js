var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoLayerGroup = require('../layers/MongoLayerGroup');

class FilteredMongoLayerGroups {
    constructor(filter, connection) {
        this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoLayerGroup.collectionName(), MongoLayerGroup);
    }

    read(){
        return this._filteredCollection.read();
    }

	json() {
		return this._filteredCollection.json();
	}
}

module.exports = FilteredMongoLayerGroups;