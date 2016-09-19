var MongoAttributeSet = require('./MongoAttributeSet');
var Promise = require('promise');

class MongoAttributeSets {
	constructor(connection) {
		this._connection = connection;
	}

	update(attributeSet) {
		return attributeSet.json().then(function(jsonAttributeSet){
			return this._connection.update({_id: jsonAttributeSet._id}, jsonAttributeSet);
		});
	}

	remove(attributeSet) {
		var self = this;
		// Remove associated layer references (layerref table)
		return attributeSet.layerReferences().then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				this._layerReferences.remove(layerReference);
			});

			return Promise.all(promises);
		}).then(function(){
			return attributeSet.id();
		}).then(function(id){
			var collection = self._connection.collection(MongoAttributeSet.collectionName());
			return collection.removeOne({_id: id});
		})
	}
}

mongo.exports = MongoAttributeSets;