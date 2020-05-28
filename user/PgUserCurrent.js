const _ = require('lodash');
const { v4: uuid } = require('uuid');

const PgDatabase = require('../postgresql/PgDatabase');

class PgUserCurrent {
	constructor(pgPool, pgSchema, userKey) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._userKey = userKey;

		this._pgDatabase = new PgDatabase(pgPool);

		this._guestGroupKey = `52ddabec-d01a-49a0-bb4d-5ff931bd346e`;
		this._userGroupKey = `e56f3545-57f5-44f9-9094-2750a69ef67e`;
	}

	getCurrent() {
		return Promise
			.resolve()
			.then(() => {
				if(this._userKey) {
					return this._pgPool
						.query(`SELECT "name", "email", "other" FROM "${this._pgSchema}"."users" WHERE "key" = '${this._userKey}'`)
						.then(async (result) => {
							return result.rows[0]
						});
				} else {
					return {};
				}
			})
			.then(async (user) => {

				console.log(`#WARNING# REWRITE NEEDED #7b9f7e9a9691#`);

				// let groups = await this.getGroups();
				// let permissions = await this.getPermissions(groups);
				let groups = [];
				let permissions = {};
				return {
					key: this._userKey || uuid(),
					data: {
						name: null,
						email: null,
						other: null,
						...user
					},
					groups: groups,
					permissions: {
						...permissions
					}
				}
			});
	}

	getGroups() {
		let where = [`ghm.user_id = ${this._userId}`];
		if(this._userId === 0) {
			where.push(`g.id = ${this._guestGroupId}`)
		} else if(this._userId >= 1) {
			where.push(`g.id = ${this._userGroupId}`)
		}

		let sql = [
			`SELECT DISTINCT g.id, g.name FROM "${this._pgSchema}"."groups" AS g`,
			`LEFT JOIN "${this._pgSchema}"."group_has_members" AS ghm ON ghm.group_id = g.id`,
			`WHERE ${where.join(' OR ')}`
		];

		return this._pgPool
			.query(sql.join(` `))
			.then((result) => {
				return _.map(result.rows, (row) => {
					return {
						key: row.id,
						data: {
							name: row.name
						}
					}
				})
			})
			.catch((error) => {
				console.log(error);
				return [];
			})
	}

	async getPermissions(groups) {
		let overalPermissions = await this.getOveralPermissions(groups);
		let permissions = {};

		let isAdmin = !!(_.find(groups, {data: {name: "admin"}}));
		let dataTypesGroupedByType = this._pgDatabase.getDataTypeStoresGroupedByType();

		_.each(dataTypesGroupedByType, (dataType) => {
			if(dataType.group) {
				permissions[dataType.group] = {};
				_.each(dataType.stores, (store) => {
					if(isAdmin) {
						permissions[dataType.group][store.tableName()] = {
							create: true,
							update: true,
							delete: true
						};
					} else {
						permissions[dataType.group][store.tableName()] = {
							create: !!(_.find(overalPermissions, {resource_type: store.tableName(), permission: `POST`})),
							update: !!(_.find(overalPermissions, {resource_type: store.tableName(), permission: `PUT`})),
							delete: !!(_.find(overalPermissions, {resource_type: store.tableName(), permission: `DELETE`}))
						};
					}
				});
			}
		});

		return permissions;
	}

	async getOveralPermissions(groups) {
		let overalPermissions = [];

		await this._pgPool
			.query(`SELECT resource_type, permission FROM "${this._pgSchema}"."permissions" WHERE user_id = ${this._userId} AND resource_id IS NULL`)
			.then((result) => {
				_.each(result.rows, (row) => {
					overalPermissions.push({
						...row,
					})
				});
			})
			.catch((error) => {
				console.log(error);
				return {};
			});

		await this._pgPool
			.query(`SELECT resource_type, permission FROM "${this._pgSchema}"."group_permissions" WHERE group_id IN (${_.map(groups, 'key').join(', ')}) AND resource_id IS NULL`)
			.then((result) => {
				_.each(result.rows, (row) => {
					overalPermissions.push({
						...row,
					})
				});
			})
			.catch((error) => {
				console.log(error);
				return {};
			});

		return overalPermissions;
	}
}

module.exports = PgUserCurrent;