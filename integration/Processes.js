var Promise = require('promise');

var logger = require('../common/Logger').applicationWideLogger;

var RunningProcess = require('./RunningProcess');


var Processes = function(mongoConnection) {
	this.mongoConnection = mongoConnection;
};

Processes.prototype.store = function(process){
	// todo
	var collection = this.mongoConnection.collection("runningProcesses");
	return new Promise(function(resolve, reject){
		collection.insert(process.json);
	});
};

Processes.prototype.all = function(){
	var collection = this.mongoConnection.collection("runningProcesses");
	return collection.find({}); // Promise
};

Processes.prototype.getById = function(id){
	var collection = this.mongoConnection.collection("runningProcesses");
	return collection.find({_id: id}); // Promise
};


module.exports = Processes;
