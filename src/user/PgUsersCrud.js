const _ = require('lodash');

const PgCrud = require('../common/PgCrud');

const PgUsers = require(`../user/PgUsers`);
const PgGroups = require(`../user/PgGroups`);

class PgUsersCrud extends PgCrud {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema);

		this._pgUsers = new PgUsers(pgPool, pgSchema);
		this._pgGroups = new PgGroups(pgPool, pgSchema);

		this._pgTypes = {
			[PgUsers.groupName()]: {
				store: this._pgUsers,
				type: PgUsers.tableName()
			},
			[PgGroups.groupName()]: {
				store: this._pgGroups,
				type: PgGroups.tableName()
			}
		};
	}
}

module.exports = PgUsersCrud;