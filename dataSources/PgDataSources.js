const PgCrud = require(`../common/PgCrud`);

const PgCommonDataSource = require(`./PgCommonDataSource`);

class PgDataSources extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgCommonDataSource = new PgCommonDataSource(pgPool, pgSchema);

		this._pgTypes = {
			[PgCommonDataSource.groupName()]: {
				store: this._pgCommonDataSource,
				type: PgCommonDataSource.tableName()
			}
		};
	}
}

module.exports = PgDataSources;