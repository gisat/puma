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
				logger.error('MongoUniqueInstance#load There is no instance with given id: ', self._id);
				allReferences = [null];
			} else if(allReferences.length > 1) {
				logger.warn('MongoUniqueInstance#load There are more instances with the same id: ', self._id);
			}
			return allReferences[0];
		}).catch(function(error){
			logger.error('MongoUniqueInstance#load Loading the instance. Error: ', error);
		});

	}
}

module.exports = MongoUniqueInstance;