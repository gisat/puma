const _ = require('lodash');

 const config = require(`../../config`);

const PgCrud = require('../common/PgCrud');

const PgScopes = require('../metadata/PgScopes');
const PgLayerTrees = require('./PgLayerTrees');
const PgApplications = require('./PgApplications');
const PgConfigurations = require('./PgConfigurations');

class PgApplicationsCrud extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgScopes = new PgScopes(pgPool, config.pgSchema.metadata);

		this._pgLayerTrees = new PgLayerTrees(pgPool, pgSchema);
		this._pgApplications = new PgApplications(pgPool, pgSchema);
		this._pgConfigurations = new PgConfigurations(pgPool, pgSchema);

		this._pgLayerTrees.setRelatedStores([this._pgScopes, this._pgApplications]);
		this._pgConfigurations.setRelatedStores([this._pgApplications]);

		this._pgTypes = {
			[PgLayerTrees.groupName()]: {
				store: this._pgLayerTrees,
				type: PgLayerTrees.tableName()
			},
			[PgApplications.groupName()]: {
				store: this._pgApplications,
				type: PgApplications.tableName()
			},
			[PgConfigurations.groupName()]: {
				store: this._pgConfigurations,
				type: PgConfigurations.tableName()
			}
		};
	}
}

module.exports = PgApplicationsCrud;