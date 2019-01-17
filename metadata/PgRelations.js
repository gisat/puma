const _ = require('lodash');

const PgCrud = require('../common/PgCrud');
const PgSpatialRelations = require('../metadata/PgSpatialRelations');
const PgAttributeRelations = require('../metadata/PgAttributeRelations');
const PgAreaRelations = require('../metadata/PgAreaRelations');

class PgRelations extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgSpatialRelations = new PgSpatialRelations(pgPool, pgSchema);
		this._pgAttributeRelations = new PgAttributeRelations(pgPool, pgSchema);
		this._pgAreaRelations = new PgAreaRelations(pgPool, pgSchema);

		this._pgTypes = {
			[PgSpatialRelations.groupName()]: {
				store: this._pgSpatialRelations,
				type: PgSpatialRelations.tableName()
			},
			[PgAttributeRelations.groupName()]: {
				store: this._pgAttributeRelations,
				type: PgAttributeRelations.tableName()
			},
			[PgAreaRelations.groupName()]: {
				store: this._pgAreaRelations,
				type: PgAreaRelations.tableName()
			}
		};
	}
}

module.exports = PgRelations;