const conn = require('../common/conn');
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

    defaultForScope(scope, theme, location, period) {
        let collection = this._connection.collection(MongoDataView.collectionName());
        let id = conn.getNextId();
        return collection.insert({
            "_id": id,
            "conf" : {
                "years" : [
                    period
                ],
                "dataset" : scope,
                "theme" : theme,
                "location" : location,
                "is3D" : true,
                "name" : "Initial",
                "description" : "",
                "language" : "en",
                "locations" : [
                    location
                ]
            }
        }).then(() => {
            return id;
        });
    }
}

module.exports = MongoDataViews;