var logger = require('../common/Logger').applicationWideLogger;

var Process = function(id, status, options){
	this.id = id;
	this.processStatus = status || "Started";
	this.options = options;
	this.message = null;

	logger.info("Process# constructor, Process", id, "created");
};

Process.prototype.status = function (newStatus, newMessage) {
	if(newStatus){
		this.processStatus = newStatus;
	}
	if(newMessage){
		this.message = newMessage;
	}
	return this.processStatus;
};

Process.prototype.setOption = function(name, value){
	this.options[name] = value;
};

Process.prototype.getOption = function(name){
	return (this.options.hasOwnProperty(name)) ? this.options[name] : undefined;
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
