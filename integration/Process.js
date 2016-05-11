var logger = require('../common/Logger').applicationWideLogger;

var Process = function(id, status, options){
	this.id = id;
	this.processStatus = status;
	this.options = options;

	this.options.status = this.options.status || "Started";

	logger.info("Process# constructor, Process", id, "created");
};

Process.prototype.status = function () {
	return this.processStatus;
};

Process.prototype.json = function () {
	return JSON.stringify(this);
};


Process.prototype.end = function(message){
	this.processStatus = "Finished";
	this.message = message;
	logger.info("Process# end(), Process", id, "finished sucessfully, message:", message);
};

Process.prototype.error = function(message){
	this.processStatus = "Error";
	this.message = message;
	logger.info("Process# error(), Process", id, "failed, message:", message);
};

module.exports = Process;
