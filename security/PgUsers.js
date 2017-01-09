let Promise = require('promise');

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
}

module.exports = PgUsers;
