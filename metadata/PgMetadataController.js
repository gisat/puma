const PgController = require(`../common/PgController`);
const PgMetadataCrud = require('../metadata/PgMetadataCrud');

class PgMetadataController extends PgController {
	constructor(app, pgPool, pgSchema, initRelatedStores) {
		super(app, pgPool, pgSchema, `metadata`);

		this._crud = new PgMetadataCrud(pgPool, pgSchema, initRelatedStores);
	}
}

module.exports = PgMetadataController;