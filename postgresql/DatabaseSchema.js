var logger = require('../common/Logger').applicationWideLogger;

/**
 * It allows manipulation with the Database Schema.
 * @param pool {PgPool} Pool of the database connections.
 * @param schema {String} Name of the schema this object represents.
 * @constructor
 * @alias DatabaseSchema
 */
var DatabaseSchema = function (pool, schema) {
    this._pool = pool.pool();
    this._schema = schema;
};

/**
 * It returns promise of dropping of the schema with all the objects in it.
 * @returns {Promise.<T>}
 */
DatabaseSchema.prototype.drop = function () {
    var dropSchema = 'drop schema ' + this._schema + ' CASCADE';
    return this._pool.query(dropSchema);
};

/**
 * It returns Promise of creation of the schema and all relevant objects in it.
 * @returns {Promise.<T>}
 */
DatabaseSchema.prototype.create = function () {
    var createAnalysis = 'create schema IF NOT EXISTS analysis';
    var createViews = 'create schema IF NOT EXISTS views';
    var createSchema = 'create schema IF NOT EXISTS ' + this._schema;
    var createStyleTable = 'create table IF NOT EXISTS ' + this._schema + '.style (' +
        'sld text,' +
        'definition text,' +
        'name text,' +
        'source text,' +
        'symbology_name text,' +
        'created timestamp,' +
        'created_by int,' +
        'changed timestamp,' +
        'changed_by int,' +
        'id varchar(64) Unique' +
        ')';
    var createMigrationTable = 'create table IF NOT EXISTS ' + this._schema + '.migration (' +
        'id SERIAL PRIMARY KEY,' +
        'name varchar(128)' +
        ');';
    var createPermissionsTable = `CREATE TABLE IF NOT EXISTS ${this._schema}.permissions (
		 id SERIAL PRIMARY KEY,
	 	 user_id int NOT NULL,
		 resource_id int,
		 resource_type varchar(20),
		 permission varchar(20)
	)`;
    let createGroupPermissionsTable = `CREATE TABLE IF NOT EXISTS ${this._schema}.group_permissions (
         id SERIAL PRIMARY KEY,
	 	 group_id int NOT NULL,
		 resource_id int,
		 resource_type varchar(20),
		 permission varchar(20)
    )`;
    let createGroup = `CREATE TABLE IF NOT EXISTS ${this._schema}.groups (
        id SERIAL PRIMARY KEY,
        name text,
        created timestamp,
        created_by int, 
        changed timestamp, 
        changed_by int
    )`;
    let createGroupHasMembers = `CREATE TABLE IF NOT EXISTS ${this._schema}.group_has_members (
        id SERIAL PRIMARY KEY,
        group_id int NOT NULL,
        user_id int NOT NULL,
        created timestamp,
        created_by int, 
        changed timestamp, 
        changed_by int
    )`;

    var self = this;
    return this._pool.query(createSchema).then(function () {
        return self._pool.query(createStyleTable);
    }).then(function () {
        return self._pool.query(createMigrationTable);
    }).then(function () {
        return self._pool.query(createPermissionsTable);
    }).then(function () {
        return self._pool.query(createGroupPermissionsTable);
    }).then(function () {
        return self._pool.query(createGroup);
    }).then(function () {
		return self._pool.query(createGroupHasMembers);
	}).then(function () {
        return self._pool.query(createAnalysis);
    }).then(function () {
        return self._pool.query(createViews);
    }).catch(function (err) {
        logger.error('DatabaseSchema#create Errors when creating the schema and associated tables. Error: ', err);
    });
};

module.exports = DatabaseSchema;
