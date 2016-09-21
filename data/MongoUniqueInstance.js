var logger = require('../common/Logger').applicationWideLogger;

class MongoUniqueInstance {
	constructor(id, connection, name) {
		this._id = id;
		this._connection = connection;
		this._name = name;
	}

	read() {
		var self = this;
		return this._connection.collection(this._name).find({_id: this._id}).toArray().then(function(allReferences){
			if(!allReferences || allReferences.length == 0) {
				logger.error('MongoLayerReference#load There is no template with given id: ', self._id);
				allReferences = [null];
			} else if(allReferences.length > 1) {
				logger.warn('MongoLayerReference#load There are more templates with the same id: ', self._id);
			}
			return allReferences[0];
		}).catch(function(error){
			logger.error('MongoLayerReference#constructor Loading the instance. Error: ', error);
		});

	}
}

module.exports = MongoUniqueInstance;