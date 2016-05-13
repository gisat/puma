var Promise = require('promise');
var _ = require('underscore');

var logger = require('../common/Logger').applicationWideLogger;

var Processes = require('./Processes');


var FilterByIdProcesses = function(db, id){
	this.processes = new Processes(db);
	this.id = id;
	if(!id){
		logger.error("integration/FilterByIdProcess# constructoir, no ID provided");
	}
	logger.info("integration/FilterByIdProcess# constructoir, constructed with id,", this.id);
};

FilterByIdProcesses.prototype.all = function() { // all of the one
	logger.trace("integration/FilterByIdProcess# all()");
	var self = this;
	return new Promise(function(resolve, reject){
		logger.trace("integration/FilterByIdProcess# all(), new Promisse"); ///
		self.processes.all().then(function(processes){
			var filtered = _.filter(processes, function(process){
				if(process.id == self.id) {
					return true;
				}
			});
			resolve(filtered);
		});
	});
};

module.exports = FilterByIdProcesses;
