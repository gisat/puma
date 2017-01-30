var Promise = require('promise');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

class MongoVisualization {
    constructor(id, connection) {
        this._id = Number(id);
        this._connection = connection;

        this._instance = new MongoUniqueInstance(this._id, connection, MongoVisualization.collectionName());
    }

    id() {
        return Promise.resolve(this._id);
    }

    json() {
        return this._instance.read();
    }

    static collectionName() {
        return 'visualization';
    }
}

module.exports = MongoVisualization;