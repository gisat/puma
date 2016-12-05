var MongoVisualization = require('./MongoVisualization');

class MongoVisualizations {
    constructor(connection) {
        this._connection = connection;
    }

    remove(visualization){
        return visualization.id().then(function(id){
            var collection = this._connection.collection(MongoVisualization.collectionName());
            return collection.removeOne({_id: id});
        });
    }

    add(visualization) {
        var self = this;
        return visualization.json().then(function(visualization){
            var collection = self._connection.collection(MongoVisualization.collectionName());
            collection.insert(visualization)
        });
    }
}

module.exports = MongoVisualizations;