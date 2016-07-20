var Promise = require('promise');
var conn = require('');

/**
 * It represents one instance of PostgreSQL database. It is used to load objects form the database or save the items into the database.
 * @constructor
 * @alias PostgreSQL.
 */
var PostgreSQL = function() {

};


PostgreSQL.prototype.save = function(object) {
	var sql = object.toSql();

	return new Promise(function(resolve, reject){

	});
};

module.exports = PostgreSQL;