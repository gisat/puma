const PgCrud = require(`../common/PgCrud`);

const PgCommonSpatialDataSource = require(`./PgCommonSpatialDataSource`);
const PgAttributeDataSource = require(`./PgAttributeDataSource`);

class PgDataSourcesCrud extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgCommonSpatialDataSource = new PgCommonSpatialDataSource(pgPool, pgSchema);
		this._pgAttributeDataSource = new PgAttributeDataSource(pgPool, pgSchema);

		this._pgTypes = {
			[PgCommonSpatialDataSource.groupName()]: {
				store: this._pgCommonSpatialDataSource,
				type: PgCommonSpatialDataSource.tableName()
			},
			[PgAttributeDataSource.groupName()]: {
				store: this._pgAttributeDataSource,
				type: PgAttributeDataSource.tableName()
			}
		};
	}
}

module.exports = PgDataSourcesCrud;