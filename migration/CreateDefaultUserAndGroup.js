let Migration = require('./Migration');

class CreateDefaultUserAndGroup extends Migration {
	constructor(schema) {
		super('createDefaultUserAndGroup');

		this.schema = schema;
	}

	process(mongoDatabase, pool) {
		return pool.pool().query(`INSERT INTO ${this.schema}.groups (name) VALUES ('admin')`).then(() => {
			return pool.pool().query(`INSERT INTO ${this.schema}.group_has_members (user_id, group_id) VALUES (1,1)`);
		}).then(() => {
			return pool.pool().query(`INSERT INTO ${this.schema}.groups (name) VALUES ('guest')`);
		}).then(() => {
			return pool.pool().query(`INSERT INTO ${this.schema}.groups (name) VALUES ('user')`);
		});
	}

	fillDefaultPermissionForUser() {

	}

	fillDefaultPermissionsForGuest() {

	}
}

module.exports = CreateDefaultUserAndGroup;