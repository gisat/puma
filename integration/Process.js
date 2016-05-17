var util = require('util');
var logger = require('../common/Logger').applicationWideLogger;

var Process = function(id, options){
	this.id = id;
	this.options = options || {};
	this.options.status = options.status || "Started";
	this.options.message = options.message || null;

	logger.info("Process# constructor, Process", this.id, "created");
};

/**
 * Set status. Returns itself.
 * @param newStatus - optional
 * @param newMessage - optional
 * @returns {Process} Process itself
 */
Process.prototype.status = function (newStatus, newMessage) {
	if(newStatus){
		this.options.status = newStatus;
	}
	if(newMessage){
		this.options.message = newMessage;
	}
	return this;
};

/**
 * Set any option to Process options. Returns itself.
 * @param name {String}
 * @param value {Process} Process itself
 */
Process.prototype.setOption = function(name, value){
	this.options[name] = value;
	return this;
};

/**
 * Get option of Process by name
 * @param name
 * @returns {undefined}
 */
Process.prototype.getOption = function(name){
	return (this.options.hasOwnProperty(name)) ? this.options[name] : undefined;
};

/**
 * Returns Mongo DB document (with _id)
 * @returns {{_id: *, options: *}}
 */
Process.prototype.mongoDoc = function(){
	return {
		_id: this.id,
		options: this.options
	};
};

/**
 * Set Finish state and message. Returns itself.
 * @param message
 * @returns {Process} Process itself
 */
Process.prototype.end = function(message){
	this.options.status = "Finished";
	this.options.message = util.format(message);
	logger.info("Process# end(), Process", this.id, "finished sucessfully, message:", message);
	return this;
};

/**
 * Set Error state and message. Returns itself.
 * @param message
 * @returns {Process} Process itself
 */
Process.prototype.error = function(message){
	this.options.status = "Error";
	this.options.message = util.format(message);
	logger.info("Process# error(), Process", this.id, "failed, message:", message);
	return this;
};

module.exports = Process;
