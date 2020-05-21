const PgController = require(`../common/PgController`);
const PgApplicationsCrud = require('../application/PgApplicationsCrud');

class PgApplicationsController extends PgController {
	constructor(app, pgPool, pgSchema, initRelatedStores) {
		super(app, pgPool, pgSchema, `applications`);

		this._crud = new PgApplicationsCrud(pgPool, pgSchema, initRelatedStores);
	}
}

module.exports = PgApplicationsController;