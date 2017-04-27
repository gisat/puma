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
    this.schema = schema;
};


/**
 * It returns promise of dropping of the schema with all the objects in it.
 * @returns {Promise.<T>}
 */
DatabaseSchema.prototype.drop = function () {
    var dropSchema = 'drop schema IF EXISTS ' + this.schema + ' CASCADE';
    return this._pool.query(dropSchema);
};

/**
 * It returns Promise of creation of the schema and all relevant objects in it.
 * @returns {Promise.<T>}
 */
DatabaseSchema.prototype.create = function () {
    var createAnalysis = 'create schema IF NOT EXISTS analysis';
    var createViews = 'create schema IF NOT EXISTS views';
    var createSchema = 'create schema IF NOT EXISTS ' + this.schema;
    var createStyleTable = 'create table IF NOT EXISTS ' + this.schema + '.style (' +
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
    var createMigrationTable = 'create table IF NOT EXISTS ' + this.schema + '.migration (' +
        'id SERIAL PRIMARY KEY,' +
        'name varchar(128)' +
        ');';
    // Security based tables.
    var createPermissionsTable = `CREATE TABLE IF NOT EXISTS ${this.schema}.permissions (
		 id SERIAL PRIMARY KEY,
	 	 user_id int NOT NULL,
		 resource_id int,
		 resource_type varchar(20),
		 permission varchar(20)
	)`;
    let createGroupPermissionsTable = `CREATE TABLE IF NOT EXISTS ${this.schema}.group_permissions (
         id SERIAL PRIMARY KEY,
	 	 group_id int NOT NULL,
		 resource_id int,
		 resource_type varchar(20),
		 permission varchar(20)
    )`;
    let createGroup = `CREATE TABLE IF NOT EXISTS ${this.schema}.groups (
        id SERIAL PRIMARY KEY,
        name text,
        created timestamp,
        created_by int, 
        changed timestamp, 
        changed_by int
    )`;
    let createGroupHasMembers = `CREATE TABLE IF NOT EXISTS ${this.schema}.group_has_members (
        id SERIAL PRIMARY KEY,
        group_id int NOT NULL,
        user_id int NOT NULL,
        created timestamp,
        created_by int, 
        changed timestamp, 
        changed_by int
    )`;
    let createInternalUsersTable = `CREATE TABLE IF NOT EXISTS ${this.schema}.panther_users (
        id SERIAL PRIMARY KEY, 
        email text NOT NULL,
        created timestamp,
        created_by int, 
        changed timestamp, 
        changed_by int  
    );`;

    // Path means the location where the layer resides. It can be something like geonode:stuff or analysis:stuff or even
    // something else.
    let createLayers = `CREATE TABLE IF NOT EXISTS ${this.schema}.layers (
        id SERIAL PRIMARY KEY,
        name text,
        path text,
        created timestamp,
        created_by int, 
        changed timestamp, 
        changed_by int
    )`;
    let createWmsLayers = `CREATE TABLE IF NOT EXISTS ${this.schema}.wms_layers (
        id SERIAL PRIMARY KEY,
        name text,
        url text,
        layer text,
        scope int,
        created timestamp,
        created_by int, 
        changed timestamp, 
        changed_by int        
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.wms_layer_has_places (
        wms_layer_id int REFERENCES ${this.schema}.wms_layers,
        place_id int
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.wms_layer_has_periods (
        wms_layer_id int REFERENCES ${this.schema}.wms_layers,
        period_id int
    );
    `;


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
    }).then(function () {
		return self._pool.query(createLayers);
	}).then(function () {
		return self._pool.query(createWmsLayers);
	}).then(function () {
		return self._pool.query(createInternalUsersTable);
	}).catch(function (err) {
        logger.error('DatabaseSchema#create Errors when creating the schema and associated tables. Error: ', err);
    });
};

module.exports = DatabaseSchema;
