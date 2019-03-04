const _ = require('lodash');

const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);

class PgUserCurrent {
	constructor(pgPool, pgSchema, userId) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._userId = userId;

		this._pgMetadataCrud = new PgMetadataCrud(pgPool, pgSchema);

		this._guestGroupId = 2;
		this._userGroupId = 3;
	}

	getCurrent() {
		return this._pgPool
			.query(`SELECT name, email, phone FROM "${this._pgSchema}"."panther_users" WHERE id = ${Number(this._userId)}`)
			.then(async (result) => {
				let groups = await this.getGroups();
				let metadataPermissions = await this.getMetadataPermissions(groups);
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
						metadata: metadataPermissions || [],
						features: []
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

	async getMetadataPermissions(groups) {
		let overalPermissions = await this.getOveralMetadataPermissions(groups);
		let metadataPermissions = {};

		let isAdmin = !!(_.find(groups, {data: {name: "admin"}}));
		let metadataGroupsByType = this._pgMetadataCrud.getGroupsByType();

		if (isAdmin) {
			_.each(metadataGroupsByType, (value, property) => {
				metadataPermissions[value] = {
					create: true,
					update: true,
					delete: true
				}
			});
		} else {
			let groupedByResourceType = {};

			_.each(overalPermissions, (value) => {
				groupedByResourceType[value.resource_type] = {
					create: !!(groupedByResourceType[value.resource_type] && groupedByResourceType[value.resource_type].create) || value.permission === 'POST',
					update: !!(groupedByResourceType[value.resource_type] && groupedByResourceType[value.resource_type].update) || value.permission === 'PUT',
					delete: !!(groupedByResourceType[value.resource_type] && groupedByResourceType[value.resource_type].delete) || value.permission === 'DELETE'
				}
			});

			_.each(groupedByResourceType, (value, property) => {
				if(metadataGroupsByType.hasOwnProperty(property)) {
					metadataPermissions[metadataGroupsByType[property]] = value;
				}
			});
		}

		return metadataPermissions;
	}

	async getOveralMetadataPermissions(groups) {
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