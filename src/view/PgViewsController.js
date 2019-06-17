const PgController = require(`src/common/PgController`);
const PgViewsCrud = require('./PgViewsCrud');

class PgViewsController extends PgController {
	constructor(app, pgPool, pgSchema) {
		super(app, pgPool, pgSchema, `views`);

		this._crud = new PgViewsCrud(pgPool, pgSchema);
	}
}

module.exports = PgViewsController;