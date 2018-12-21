const _ = require('lodash');

class PgUserCurrent {
	constructor(pgPool, pgSchema, userId) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._userId = userId;

		this._guestGroupId = 2;
		this._userGroupId = 3;
	}

	getCurrent() {
		return this._pgPool
			.query(`SELECT name, email, phone FROM "${this._pgSchema}"."panther_users" WHERE id = ${Number(this._userId)}`)
			.then(async (result) => {
				return {
					key: this._userId,
					data: {
						name: "",
						email: "",
						phone: "",
						...result.rows[0]
					},
					groups: await this.getGroups(),
					metadata: [],
					features: []
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
	}
}

module.exports = PgUserCurrent;