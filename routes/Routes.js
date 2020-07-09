const PgRelationsController = require('../relations/PgRelationsController');
const PgMetadataController = require('../metadata/PgMetadataController');
const PgUserController = require('../user/PgUserController');
const PgApplicationController = require('../application/PgApplicationsController');
const PgSpecificController = require('../specific/PgSpecificController');
const PgDataSourcesController = require(`../dataSources/PgDataSourcesController`);
const PgViewsController = require(`../view/PgViewsController`);
const PgDataController = require(`../data/PgDataController`);
const modulesRouter = require('../modules/index').router;

const config = require(`../config`);

class Routes {
	constructor(app, pgPool, initRelatedStores) {
		this._app = app;
		this._pgPool = pgPool;
		this._initRelatedStores = initRelatedStores;
	}

	init() {
		new PgViewsController(this._app, this._pgPool, config.pgSchema.views, this._initRelatedStores);
		new PgSpecificController(this._app, this._pgPool, config.pgSchema.specific, this._initRelatedStores);
		new PgDataController(this._app, this._pgPool, this._initRelatedStores);
		this._app.use(modulesRouter);
	}
}

module.exports = Routes;