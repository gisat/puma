const PgController = require(`../common/PgController`);
const PgSpecificCrud = require('../specific/PgSpecificCrud');

class PgSpecificController extends PgController {
	constructor(app, pgPool, pgSchema, initRelatedStores) {
		super(app, pgPool, pgSchema, `specific`);

		this._crud = new PgSpecificCrud(pgPool, pgSchema, initRelatedStores);
	}
}

module.exports = PgSpecificController;