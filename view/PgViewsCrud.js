const PgCrud = require(`../common/PgCrud`);

const PgViews = require(`./PgViews`);

class PgViewsCrud extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		this._pgViews = new PgViews(pgPool, pgSchema);

		this._pgTypes = {
			[PgViews.groupName()]: {
				store: this._pgViews,
				type: PgViews.tableName()
			}
		};
	}
}

module.exports = PgViewsCrud;