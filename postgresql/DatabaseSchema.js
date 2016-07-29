var logger = require('../common/Logger').applicationWideLogger;

/**
 * It allows manipulation with the Database Schema.
 * @param pool {PgPool} Pool of the database connections.
 * @param schema {String} Name of the schema this object represents.
 * @constructor
 * @alias DatabaseSchema
 */
var DatabaseSchema = function(pool, schema) {
	this._pool = pool.pool();
	this._schema = schema;
};

/**
 * It returns promise of dropping of the schema with all the objects in it.
 * @returns {Promise.<T>}
 */
DatabaseSchema.prototype.drop = function() {
	var dropSchema = 'drop schema ' + this._schema + ' CASCADE';
	return this._pool.query(dropSchema);
};

/**
 * It returns Promise of creation of the schmea and all relevnat objects in it.
 * @returns {Promise.<T>}
 */
DatabaseSchema.prototype.create = function() {
	var createSchema = 'create schema IF NOT EXISTS ' + this._schema;
	var createStyleTable = 'create table IF NOT EXISTS ' + this._schema + '.style (' +
		'sld text,' +
		'definition text,' +
		'name text,' +
		'symbology_name text,' +
		'created timestamp,' +
		'created_by int,' +
		'changed timestamp,' +
		'changed_by int,' +
		'uuid varchar(64) Unique' +
		')';

	var self = this;
	return this._pool.query(createSchema).then(function(){
		return self._pool.query(createStyleTable);
	}).catch(function(err){
		logger.error('DatabaseSchema#create Errors when creating the schema and associated tables. Error: ', err);
	});
};

module.exports = DatabaseSchema;
