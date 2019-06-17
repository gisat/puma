const PgCrud = require(`src/common/PgCrud`);

const PgCommonSpatialDataSource = require(`src/dataSources/PgCommonSpatialDataSource`);
const PgAttributeDataSource = require(`src/dataSources/PgAttributeDataSource`);

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