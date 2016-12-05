var MongoFilteredCollection = require('../data/MongoFilteredCollection');
var MongoTheme = require('./MongoTheme');

class FilteredMongoThemes {
    constructor(filter, connection) {
        this._filteredCollection = new MongoFilteredCollection(filter, connection, MongoTheme.collectionName(), MongoTheme);
    }

    read(){
        return this._filteredCollection.read();
    }
}

module.exports = FilteredMongoThemes;