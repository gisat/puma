const PgController = require(`../common/PgController`);
const PgMetadataCrud = require('./PgMetadataCrud');

class PgMetadataController extends PgController {
	constructor(app, pgPool, pgSchema) {
		super(app, pgPool, pgSchema, `metadata`);

		this._crud = new PgMetadataCrud(pgPool, pgSchema);
	}
}

module.exports = PgMetadataController;