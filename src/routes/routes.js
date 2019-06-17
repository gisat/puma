const config = require('../../config');

const DatabaseSchema = require('../postgresql/DatabaseSchema');

const GroupController = require('../security/GroupController');
const LoginController = require('./LoginController');
const PermissionController = require('../security/UserController');
const PgApplicationController = require('../application/PgApplicationsController');
const PgDataController = require(`../data/PgDataController`);
const PgDataSourcesController = require(`../dataSources/PgDataSourcesController`);
const PgMetadataController = require('../metadata/PgMetadataController');
const PgRelationsController = require('../relations/PgRelationsController');
const PgSpatialDataSourcesController = require('./PgSpatialDataSourcesController');
const PgSpecificController = require('../specific/PgSpecificController');
const PgUserController = require('../user/PgUserController');
const PgViewsController = require(`../view/PgViewsController`);

module.exports = function(app, pool) {
	new DatabaseSchema(pool, config.pgSchema.data).create();

	new LoginController(app, pool);
	new PermissionController(app, pool, config.pgSchema.data);
	new GroupController(app, pool);

	new PgSpatialDataSourcesController(app, pool, config.pgSchema.data);
	new PgUserController(app, pool, config.pgSchema.data);
	new PgMetadataController(app, pool.pool(), config.pgSchema.metadata);
	new PgRelationsController(app, pool.pool(), config.pgSchema.relations);
	new PgDataSourcesController(app, pool.pool(), config.pgSchema.dataSources);
	new PgApplicationController(app, pool.pool(), config.pgSchema.application);
	new PgViewsController(app, pool.pool(), config.pgSchema.views);
	new PgSpecificController(app, pool.pool(), config.pgSchema.specific);
	new PgDataController(app, pool);
};
