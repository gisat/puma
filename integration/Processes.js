var Promise = require('promise');

var logger = require('../common/Logger').applicationWideLogger;

var RunningProcess = require('./RunningProcess');


var Processes = function(mongoConnection) {
	this.mongoConnection = mongoConnection;
};

Processes.prototype.store = function(process){
	// todo
};


Processes.prototype.all = function(){
	var self = this;
	return new Promise(function(resolve, reject){

		// todo get all record using db.collection and resolve

		// crud.read("runningProcesses", {}, {}, function(err, results){
		// 	if(err){
		// 		logger.error("RunningProcess# get(), CRUD Error:", err);
		// 		reject(err);
		// 	}
		// 	logger.info("RunningProcess# get(), CRUD results:", results);
		// 	resolve(results);
		// });
	});
};



module.exports = Processes;
