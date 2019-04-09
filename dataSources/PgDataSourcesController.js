const PgController = require(`../common/PgController`);
const PgDataSourcesCrud = require('./PgDataSourcesCrud');

class PgDataSourcesController extends PgController {
	constructor(app, pgPool, pgSchema) {
		super(app, pgPool, pgSchema, `dataSources`);

		this._crud = new PgDataSourcesCrud(pgPool, pgSchema);
	}
}

module.exports = PgDataSourcesController;