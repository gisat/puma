let Promise = require('promise');

let logger = require('../common/Logger').applicationWideLogger;

let PgPermissions = require('./PgPermissions');
let PgGroups = require('./PgGroups');
let User = require('./User');
let Group = require('./Group');

class PgUsers {
	constructor(pool, schema) {
		this.pgPool = pool;
		this.schema = schema;

		this.groups = new PgGroups(pool, schema);
		this.permissions = new PgPermissions(pool, schema);
	}

	/**
	 * Every existing user belongs on top of other groups to the groups guest and user.
	 * Everyone accessing the platform belongs to the group guest.
	 * @param id {Number} Id of the user.
	 */
	byId(id) {
		let groups;
		return new PgGroups(this.pgPool, this.schema).forUser(id).then(pGroups => {
			groups = pGroups;
			return Promise.all(groups.map(group => {
				return this.permissions.forGroup(group.id).then(permissions => {
					group.permissions = permissions;
				});
			}));
		}).then(() => {
			return this.permissions.forGroup(Group.guestId())
		}).then((guestPermissions) => {
			groups.push(new Group(Group.guestId(), guestPermissions, "guest"));
			return this.permissions.forGroup(Group.userId())
		}).then((guestPermissions) => {
			groups.push(new Group(Group.userId(), guestPermissions, "user"));
			return this.permissions.forUser(id);
		}).then(permissions => {
			return new User(id, permissions, groups);
		});
	}

	/**
	 * It queries internal users based on their email. If there is none such user, it returns null
	 * @param email {String} String representation of email of the user used for querying the internal users.
	 * @returns {Promise} Promise returning either user with permissions or null.
	 */
	byEmail(email) {
		return this.pgPool.query(`SELECT * FROM ${this.schema}.panther_users WHERE email = '${email}'`).then(results => {
			if(results.rows.length === 0) {
				logger.warn(`PgUsers#byEmail No user with email: ${email}`);
				return null;
			}

			return this.byId(Number(results.rows[0].id));
		});
	}

	/**
	 * It adds new internal user to the database.
	 * @param email {String} Email for the user to be used.
	 */
	add(email) {
		return this.pgPool.query(`INSERT INTO ${this.schema}.panther_users (email) VALUES ('${email}') RETURNING id`).then(result => {
			return result.rows[0].id;
		});
	}
}

module.exports = PgUsers;
