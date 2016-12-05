var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoVisualization = require('./MongoVisualization');

class FilteredMongoVisualizations {
    constructor(filter, connection) {
        this._connection = connection;

        this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoVisualization.collectionName(), MongoVisualization);
    }

    read() {
        return this._filteredCollection.read();
    }
}

module.exports = FilteredMongoVisualizations;