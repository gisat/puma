const _ = require('lodash');

const PgCrud = require('../common/PgCrud');

const PgUsers = require(`./PgUsers`);
const PgGroups = require(`./PgGroups`);

class PgUser extends PgCrud {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo);

		this._pgUsers = new PgUsers(pgPool, pgSchema, mongo);
		this._pgGroups = new PgGroups(pgPool, pgSchema, mongo);

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

module.exports = PgUser;