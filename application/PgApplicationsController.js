const PgController = require(`../common/PgController`);
const PgApplicationsCrud = require('../application/PgApplicationsCrud');

class PgApplicationsController extends PgController {
	constructor(app, pgPool, pgSchema) {
		super(app, pgPool, pgSchema, `applications`);

		this._crud = new PgApplicationsCrud(pgPool, pgSchema);
	}
}

module.exports = PgApplicationsController;