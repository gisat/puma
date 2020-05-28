const _ = require('lodash');

const PgCrud = require('../common/PgCrud');

const PgUsers = require(`./PgUsers`);
const PgGroups = require(`./PgGroups`);
const PgPermissions = require(`./PgPermissions`);
// const PgUserPermissions = require(`./PgUserPermissions`);
// const PgGroupPermissions = require(`./PgGroupPermissions`);

class PgUsersCrud extends PgCrud {
	constructor(pgPool, pgSchema, initRelatedStores) {
		super(pgPool, pgSchema);

		this._pgUsers = new PgUsers(pgPool, pgSchema);
		this._pgGroups = new PgGroups(pgPool, pgSchema);
		// this._pgUserPermissions = new PgUserPermissions(pgPool, pgSchema);
		// this._pgGroupPermissions = new PgGroupPermissions(pgPool, pgSchema);
		this._pgPermissions = new PgPermissions(pgPool, pgSchema);

		this._pgUsers.setRelatedStores([this._pgGroups], initRelatedStores);
		this._pgPermissions.setRelatedStores([this._pgUsers, this._pgGroups], initRelatedStores);

		this._pgTypes = {
			[PgUsers.groupName()]: {
				store: this._pgUsers,
				type: PgUsers.tableName()
			},
			[PgGroups.groupName()]: {
				store: this._pgGroups,
				type: PgGroups.tableName()
			},
			// [PgUserPermissions.groupName()]: {
			// 	store: this._pgUserPermissions,
			// 	type: PgUserPermissions.tableName()
			// },
			// [PgGroupPermissions.groupName()]: {
			// 	store: this._pgGroupPermissions,
			// 	type: PgGroupPermissions.tableName()
			// }
			[PgPermissions.groupName()]: {
				store: this._pgPermissions,
				type: PgPermissions.tableName()
			}
		};
	}
}

module.exports = PgUsersCrud;