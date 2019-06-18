const config = require('../../config');

const PgDatabase = require(`../postgresql/PgDatabase`);

const GroupController = require('../security/GroupController');
const LoginController = require('./LoginController');
const PermissionController = require('../security/UserController');
const PgApplicationController = require('../application/PgApplicationsController');
const PgDataController = require(`../data/PgDataController`);
const PgDataSourcesController = require(`../dataSources/PgDataSourcesController`);
const PgMetadataController = require('../metadata/PgMetadataController');
const PgRelationsController = require('../relations/PgRelationsController');
const PgSpecificController = require('../specific/PgSpecificController');
const PgUserController = require('../user/PgUserController');
const PgViewsController = require(`../view/PgViewsController`);

module.exports = function(app, pgPool) {
	new PgDatabase(pgPool).ensure();

	new LoginController(app, pgPool);
	new GroupController(app, pgPool);

	new PgUserController(app, pgPool, config.pgSchema.data);
	new PgMetadataController(app, pgPool.pool(), config.pgSchema.metadata);
	new PgRelationsController(app, pgPool.pool(), config.pgSchema.relations);
	new PgDataSourcesController(app, pgPool.pool(), config.pgSchema.dataSources);
	new PgApplicationController(app, pgPool.pool(), config.pgSchema.application);
	new PgViewsController(app, pgPool.pool(), config.pgSchema.views);
	new PgSpecificController(app, pgPool.pool(), config.pgSchema.specific);
	new PgDataController(app, pgPool);

	new PermissionController(app, pgPool, config.pgSchema.data);
};
