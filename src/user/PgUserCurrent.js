const _ = require('lodash');

const PgDatabase = require(`src/postgresql/PgDatabase`);

class PgUserCurrent {
	constructor(pgPool, pgSchema, userId) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._userId = userId;

		this._pgDatabase = new PgDatabase(pgPool);

		this._guestGroupId = 2;
		this._userGroupId = 3;
	}

	getCurrent() {
		return this._pgPool
			.query(`SELECT name, email, phone FROM "${this._pgSchema}"."panther_users" WHERE id = ${Number(this._userId)}`)
			.then(async (result) => {
				let groups = await this.getGroups();
				let permissions = await this.getPermissions(groups);
				return {
					key: this._userId,
					data: {
						name: "",
						email: "",
						phone: "",
						...result.rows[0]
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