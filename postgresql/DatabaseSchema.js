const SymbologyToPostgreSqlMigration = require('../migration/SymbologyToPostgreSql');
const CreateDefaultUserAndGroup = require('../migration/CreateDefaultUserAndGroup');
const IdOfTheResourceMayBeText = require('../migration/IdOfTheResourceMayBeText');
const PrepareForInternalUser = require('../migration/PrepareForInternalUser');
const AddCustomInfoToWms = require('../migration/AddCustomInfoToWms');
const MigrateAwayFromGeonode = require('../migration/MigrateAwayFromGeonode');
const AddAuditInformation = require('../migration/AddAuditInformation');
const AddGetDatesToWmsLayers = require('../migration/AddGetDatesToWmsLayers');
const AddPhoneToUser = require('../migration/AddPhoneToUser');
const AddMetadataToLayer = require('../migration/2_10_1_AddMetadataToLayer');
const AddSourceUrlToLayer = require('../migration/2_12_AddSourceUrlToLayer');
const AddSession = require('../migration/2_14_AddSession');
const AddIdentifierToGroup = require('../migration/2_14_1_AddIdentifierToGroup');

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
    let createUserDetailsTable = `CREATE TABLE IF NOT EXISTS "${this.schema}"."user_details" (
    		id SERIAL PRIMARY KEY,
    		user_id INTEGER,
    		name TEXT,
    		phone TEXT,
    		organisation TEXT
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
    let createInvitation = `CREATE TABLE IF NOT EXISTS ${this.schema}.invitation (
        id SERIAL PRIMARY KEY,
        hash text,
        email text
    );  
    `;

    let createMetadataStructure = `
    CREATE TABLE IF NOT EXISTS ${this.schema}.period (
      id   SERIAL PRIMARY KEY,
      name text
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.layer_group (
      id       SERIAL PRIMARY KEY,
      name     text,
      priority integer
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.analytical_unit_template (
      id   SERIAL PRIMARY KEY,
      name text
    );
    
    CREATE TABLE IF NOT EXISTS ${this.schema}.scope (
      id            SERIAL PRIMARY KEY,
      name          text,
      configuration jsonb
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.scope_has_period (
      id        SERIAL PRIMARY KEY,
      scope_id  integer,
      period_id integer
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.scope_has_analytical_unit_template (
      id                          SERIAL PRIMARY KEY,
      scope_id                    integer,
      analytical_unit_template_id integer
    );
    
    CREATE TABLE IF NOT EXISTS ${this.schema}.place (
      id       SERIAL PRIMARY KEY,
      name     text,
      bbox     text,
      scope_id integer
    );
    
    CREATE TABLE IF NOT EXISTS ${this.schema}.layer_template (
      id             SERIAL PRIMARY KEY,
      name  text,
      layer_group_id integer
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.layer_template_has_style (
      id                SERIAL PRIMARY KEY,
      layer_template_id integer,
      style_id          text
    );   
    
    CREATE TABLE IF NOT EXISTS ${this.schema}.attribute (
      id    SERIAL PRIMARY KEY,
      name  text,
      type  text,
      unit  text,
      color text
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.attribute_set (
      id   SERIAL PRIMARY KEY,
      name text
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.attribute_set_has_attribute (
      id               SERIAL PRIMARY KEY,
      attribute_set_id integer,
      attribute_id     integer
    );
    
    CREATE TABLE IF NOT EXISTS ${this.schema}.scenario (
      id   SERIAL PRIMARY KEY,
      name text,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.scenario_case (
      id   SERIAL PRIMARY KEY,
      name TEXT,
      description TEXT,
      geometry GEOMETRY
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.scenario_scenario_case_relation (
      id   SERIAL PRIMARY KEY,
      scenario_id INTEGER,
      scenario_case_id INTEGER,
      UNIQUE(scenario_id, scenario_case_id)
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.scope_scenario_case_relation (
      id   SERIAL PRIMARY KEY,
      scope_id INTEGER,
      scenario_case_id INTEGER,
      UNIQUE(scope_id, scenario_case_id)
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.place_scenario_case_relation (
      id   SERIAL PRIMARY KEY,
      place_id INTEGER,
      scenario_case_id INTEGER,
      UNIQUE(place_id, scenario_case_id)
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.spatial_type (
      id   SERIAL PRIMARY KEY,
      name text
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.spatial_data_source (
      id       SERIAL PRIMARY KEY,
      type_id  integer,
      layer_id integer
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.spatial_relation (
      id             SERIAL PRIMARY KEY,
      scope_id       integer,
      period_id      integer,
      place_id       integer,
      data_source_id integer,
      layer_template_id integer,      
      scenario_id    integer,
      case_key  TEXT
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.wms (
        id SERIAL PRIMARY KEY,
        name text,
        url text,
        layer text,
        custom text
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}."spatial_data_source_shapefile" (
        id SERIAL PRIMARY KEY,
        layer_name TEXT,
        table_name TEXT
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}."spatial_data_source_geotiff" (
        id SERIAL PRIMARY KEY,
        layer_name TEXT,
        table_name TEXT
    );
    CREATE TABLE IF NOT EXISTS "${this.schema}"."attribute_relation" (
	  id SERIAL PRIMARY KEY,
	  uuid UUID DEFAULT gen_random_uuid(),
	  scope_key TEXT,
	  place_key TEXT,
	  period_key TEXT,
	  scenario_key TEXT,
	  case_key TEXT,
	  template_key TEXT,
	  attribute_set_key TEXt,
	  attribute_key TEXT,
	  source_record_key TEXT
    );
	
    CREATE TABLE IF NOT EXISTS "${this.schema}"."attribute_data_source" (
	  id SERIAL PRIMARY KEY,
	  uuid UUID DEFAULT gen_random_uuid(),
	  type TEXT,
	  type_record_key TEXT
    );

    CREATE TABLE IF NOT EXISTS "${this.schema}"."attribute_data_source_vector" (
	  id SERIAL PRIMARY KEY,
	  uuid UUID DEFAULT gen_random_uuid(),
	  table_name TEXT,
	  table_column TEXT
    );
    CREATE TABLE IF NOT EXISTS "${this.schema}"."lpis_case" (
        id  SERIAL PRIMARY KEY,
        submit_date TIMESTAMP,
        code_dpb    TEXT,
        code_ji TEXT,
        case_key    TEXT,
        change_description  TEXT,
        change_description_place    TEXT,
        change_description_other    TEXT,
        evaluation_result	    TEXT,
        evaluation_description  TEXT,
        evaluation_description_other    TEXT,
        evaluation_used_sources TEXT,
        geometry_before GEOMETRY,
        geometry_after GEOMETRY
     );
    CREATE TABLE IF NOT EXISTS "${this.schema}"."lpis_case_change" (
        id SERIAL PRIMARY KEY,
        changed_by  INTEGER,
        date    TIMESTAMP WITH TIME ZONE,
        lpis_case_id INTEGER,
        status  TEXT,
        change  JSON
    );
    CREATE TABLE IF NOT EXISTS "${this.schema}"."lpis_case_view_relation" (
    	id	SERIAL PRIMARY KEY,
    	lpis_case_id	INTEGER,
    	view_id	INTEGER
    );
    CREATE TABLE IF NOT EXISTS "${this.schema}"."lpis_case_place_relation" (
    	id	SERIAL PRIMARY KEY,
    	lpis_case_id	INTEGER,
    	place_id	INTEGER
    );
    CREATE TABLE IF NOT EXISTS "${this.schema}"."metadata_changes" (
      id SERIAL PRIMARY KEY,
      resource_type TEXT,
      resource_key TEXT,
      action TEXT,
      changed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      changed_by INTEGER,
      change JSON
    );
    CREATE TABLE IF NOT EXISTS ${this.schema}.postgis_table (
      id   SERIAL PRIMARY KEY,
      name text,
      col  text
    );    
    CREATE TABLE IF NOT EXISTS "${this.schema}"."original_filenames" (
        id  SERIAL PRIMARY KEY,
        path text,
        system_filename text,
        original_filename text,
        UNIQUE(path, system_filename, original_filename) 
    );
    `;

    let createUploadManagerTables = `
    CREATE TABLE IF NOT EXISTS "${this.schema}"."uploads" (
    	uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    	path TEXT,
    	name TEXT,
    	owner INT,
    	custom_name TEXT,
    	created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;

    let self = this;
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
    }).then(function () {
        return self._pool.query(createInvitation);
    }).then(function () {
    	return self._pool.query(createUserDetailsTable);
    }).then(function () {
        return self._pool.query(createMetadataStructure);
    }).then(function () {
		return self._pool.query(createUploadManagerTables);
	}).catch(function (err) {
        logger.error('DatabaseSchema#create Errors when creating the schema and associated tables. Error: ', err);
    });
};

/**
 * It runs all the migration necessary for the Panther solution.
 * @returns {*}
 */
DatabaseSchema.prototype.migrate = function () {
    return new SymbologyToPostgreSqlMigration(config.postgreSqlSchema).run().then(() => {
        return new CreateDefaultUserAndGroup(config.postgreSqlSchema).run();
    }).then(() => {
        return new IdOfTheResourceMayBeText(config.postgreSqlSchema).run();
    }).then(() => {
        return new PrepareForInternalUser(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddCustomInfoToWms(config.postgreSqlSchema).run();
    }).then(() => {
        return new MigrateAwayFromGeonode(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddAuditInformation(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddGetDatesToWmsLayers(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddPhoneToUser(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddMetadataToLayer(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddSourceUrlToLayer(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddSession(config.postgreSqlSchema).run();
    }).then(() => {
        return new AddIdentifierToGroup(config.postgreSqlSchema).run();
    })
};

module.exports = DatabaseSchema;
