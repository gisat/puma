let Promise = require('promise');

let PgPermissions = require('./PgPermissions');
let PgGroups = require('./PgGroups');
let User = require('./User');

class PgUsers {
	constructor(pool, schema) {
		this.pgPool = pool;
		this.schema = schema;

		this.groups = new PgGroups(pool, schema);
		this.permissions = new PgPermissions(pool, schema);
	}

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
			return this.permissions.forUser(id);
		}).then(permissions => {
			return new User(id, permissions, groups);
		});
	}
}

module.exports = PgUsers;
