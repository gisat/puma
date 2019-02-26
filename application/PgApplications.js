const _ = require('lodash');

const PgCrud = require('../common/PgCrud');

const PgScopes = require('../metadata/PgScopes');
const PgLayerTrees = require('../application/PgLayerTrees');

class PgApplications extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgScopes = new PgScopes(pgPool, pgSchema);
		this._pgLayerTrees = new PgLayerTrees(pgPool, pgSchema);

		this._pgLayerTrees.setRelatedStores([this._pgScopes]);

		this._pgTypes = {
			[PgLayerTrees.groupName()]: {
				store: this._pgLayerTrees,
				type: PgLayerTrees.tableName()
			}
		};
	}
}

module.exports = PgApplications;