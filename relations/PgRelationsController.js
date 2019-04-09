const PgController = require(`../common/PgController`);
const PgRelationsCrud = require('./PgRelationsCrud');

class PgRelationsController extends PgController {
	constructor(app, pgPool, pgSchema) {
		super(app, pgPool, pgSchema, `relations`);

		this._crud = new PgRelationsCrud(pgPool, pgSchema);
	}
}

module.exports = PgRelationsController;