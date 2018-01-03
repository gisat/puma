var conn = require('./conn');
var Promise = require('promise');

/**
 * @alias Id
 * @constructor
 */
var Id = function() {
	this._id = conn.getNextId();
};

Id.prototype.toNumber = function() {
	return Promise.resolve(this._id);
};

module.exports = Id;