var MongoDataView = require('./MongoDataView');

class MongoDataViews {
    constructor(connection) {
        this._connection = connection;
    }

    remove(visualization){
        var self = this;
        return visualization.id().then(function(id){
            var collection = self._connection.collection(MongoDataView.collectionName());
            return collection.removeOne({_id: id});
        });
    }

    add(dataView) {
        var self = this;
        return dataView.json().then(function(dataView){
            var collection = self._connection.collection(MongoDataView.collectionName());
            collection.insert(dataView)
        });
    }
}

module.exports = MongoDataViews;