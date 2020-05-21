const PgController = require(`../common/PgController`);
const PgRelationsCrud = require('./PgRelationsCrud');

class PgRelationsController extends PgController {
	constructor(app, pgPool, pgSchema, initRelatedStores) {
		super(app, pgPool, pgSchema, `relations`);

		this._crud = new PgRelationsCrud(pgPool, pgSchema, initRelatedStores);
	}
}

module.exports = PgRelationsController;