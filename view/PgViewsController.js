const PgController = require(`../common/PgController`);
const PgViewsCrud = require('../view/PgViewsCrud');

class PgViewsController extends PgController {
	constructor(app, pgPool, pgSchema) {
		super(app, pgPool, pgSchema, `views`);

		this._crud = new PgViewsCrud(pgPool, pgSchema);
	}
}

module.exports = PgViewsController;