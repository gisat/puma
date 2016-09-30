var MongoDataView = require('./MongoDataView');

class MongoDataViews {
    constructor(connection) {
        this._connection = connection;
    }

    remove(visualization){
        return visualization.id().then(function(id){
            var collection = this._connection.collection(MongoDataView.collectionName());
            return collection.removeOne({_id: id});
        });
    }
}

module.exports = MongoDataViews;