var MongoDataView = require('./MongoDataView');

class MongoDataViews {
    constructor(connection) {
        this._connection = connection;
    }
    
    remove(visualization) {
        var self = this;
        return visualization.id().then(function (id) {
            var collection = self._connection.collection(MongoDataView.collectionName());
            return collection.removeOne({_id: id});
        });
    }
    
    add(dataView) {
        let collection = this._connection.collection(MongoDataView.collectionName());
        return collection.insert(dataView);
    }
}

module.exports = MongoDataViews;