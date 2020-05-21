const config = require(`../config`);

const PgCrud = require(`../common/PgCrud`);

const PgViews = require(`./PgViews`);

const PgApplications = require(`../application/PgApplications`);

class PgViewsCrud extends PgCrud {
	constructor(pgPool, pgSchema, initRelatedStores) {
		super();

		this._pgViews = new PgViews(pgPool, pgSchema);

		this._pgApplications = new PgApplications(pgPool, config.pgSchema.application);

		this._pgViews.setRelatedStores([this._pgApplications], initRelatedStores);

		this._pgTypes = {
			[PgViews.groupName()]: {
				store: this._pgViews,
				type: PgViews.tableName()
			}
		};
	}
}

module.exports = PgViewsCrud;