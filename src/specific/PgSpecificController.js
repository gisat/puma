const PgController = require(`../common/PgController`);
const PgSpecificCrud = require('./PgSpecificCrud');

class PgSpecificController extends PgController {
	constructor(app, pgPool, pgSchema) {
		super(app, pgPool, pgSchema, `specific`);

		this._crud = new PgSpecificCrud(pgPool, pgSchema);
	}
}

module.exports = PgSpecificController;