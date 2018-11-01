const _ = require('lodash');

const PgCrud = require('../common/PgCrud');
const PgSpatialRelations = require('../metadata/PgSpatialRelations');
const PgAttributeRelations = require('../metadata/PgAttributeRelations');

class PgRelations extends PgCrud {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo);

		this._pgSpatialRelations = new PgSpatialRelations(pgPool, pgSchema);
		this._pgAttributeRelations = new PgAttributeRelations(pgPool, pgSchema);

		this._pgTypes = {
			spatial: {
				store: this._pgSpatialRelations,
				type: PgSpatialRelations.tableName()
			},
			attribute: {
				store: this._pgAttributeRelations,
				type: PgAttributeRelations.tableName()
			}
		};
	}
}

module.exports = PgRelations;