const _ = require('lodash');

const PgCrud = require('../common/PgCrud');
const PgSpatialDataSourceRelations = require('./PgSpatialDataSourceRelations');
const PgAttributeDataSourceRelations = require('./PgAttributeDataSourceRelations');
const PgAreaRelations = require('./PgAreaRelations');

class PgRelationsCrud extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgSpatialDataSourceRelations = new PgSpatialDataSourceRelations(pgPool, pgSchema);
		this._pgAttributeDataSourceRelations = new PgAttributeDataSourceRelations(pgPool, pgSchema);
		this._pgAreaRelations = new PgAreaRelations(pgPool, pgSchema);

		this._pgTypes = {
			[PgSpatialDataSourceRelations.groupName()]: {
				store: this._pgSpatialDataSourceRelations,
				type: PgSpatialDataSourceRelations.tableName()
			},
			[PgAttributeDataSourceRelations.groupName()]: {
				store: this._pgAttributeDataSourceRelations,
				type: PgAttributeDataSourceRelations.tableName()
			},
			[PgAreaRelations.groupName()]: {
				store: this._pgAreaRelations,
				type: PgAreaRelations.tableName()
			}
		};
	}
}

module.exports = PgRelationsCrud;