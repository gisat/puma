var Promise = require('promise');

var logger = require('../common/Logger').applicationWideLogger;

var Process = require('./Process');


var Processes = function(mongoConnection) {
	this.mongoConnection = mongoConnection;
};

/**
 * Save process to Mongo DB
 * @param {Process} process to be inserted or updated
 * @returns {Promise} Promise resolving to the process object itself
 */
Processes.prototype.store = function(process){
	// todo add timestamps (created, changed)
	var collection = this.mongoConnection.collection("runningProcesses");
	return new Promise(function(resolve, reject){
		collection.save(process.mongoDoc(), {w:1}).then(function(result){
			logger.info("integration/Processes# store(), Process saved. ", result.result);
			resolve(process);
		}).catch(function(err){
			throw new Error(
				logger.error("integration/Processes# store(), Process saving failed: ", err)
			);
		});
	});
};

/**
 * Read all processes from Mongo DB
 * @returns {Promise} Promise resolving to array of Processes
 */
Processes.prototype.all = function(){
	logger.info("integration/Processes# all()");
	var self = this;
	return new Promise(function(resolve, reject){
		var collection = self.mongoConnection.collection("runningProcesses");
		var processes = [];
		collection.find({}).forEach(function(process){
			processes.push(new Process(process._id, process.options));
		}, function(err){
			if(err){
				reject(err);
			}
			resolve(processes);
		});
	});
};


module.exports = Processes;
