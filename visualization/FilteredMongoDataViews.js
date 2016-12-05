var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoDataView = require('./MongoDataView');

class FilteredMongoDataViews {
    constructor(filter, connection) {
        this._connection = connection;

        this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoDataView.collectionName(), MongoDataView);
    }

    read() {
        return this._filteredCollection.read();
    }
}

module.exports = FilteredMongoDataViews;