let Migration = require('./Migration');
let PgPermissions = require('../security/PgPermissions');

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
let FilteredMongoTopics = require('../metadata/FilteredMongoTopics');

let Group = require('../security/Group');
let Promise = require('promise');

class CreateDefaultUserAndGroup extends Migration {
	constructor(schema) {
		super('createDefaultUserAndGroup', schema);

		this.schema = schema;
	}

	process(mongoDatabase, pool) {
		return pool.pool().query(`INSERT INTO ${this.schema}.groups (name) VALUES ('admin')`).then(() => {
			return pool.pool().query(`INSERT INTO ${this.schema}.group_has_members (user_id, group_id) VALUES (1,1)`);
		}).then(() => {
			return pool.pool().query(`INSERT INTO ${this.schema}.groups (name) VALUES ('guest')`);
		}).then(() => {
			return pool.pool().query(`INSERT INTO ${this.schema}.groups (name) VALUES ('user')`);
		}).then(() => {
			// return this.fillDefaultPermissions(mongoDatabase, pool);
		});
	}

	fillDefaultPermissions(mongoDatabase, pool) {
		let permissions = new PgPermissions(pool, this.schema);
		new FilteredMongoScopes({}, mongoDatabase).json().then(scopes => {
			return this.preparePermissionsForType(permissions, scopes, "dataset");
		}).then(() => {
			return new FilteredMongoLocations({}, mongoDatabase).json();
		}).then(locations => {
			return this.preparePermissionsForType(permissions, locations, "location");
		}).then(() => {
			return new FilteredMongoTopics({}, mongoDatabase).json();
		}).then(topics => {
			return this.preparePermissionsForType(permissions, topics, "topic");
		});
	}

	/**
	 * It takes type such as scope and assign right to read to all guests, right to create, update and delete to users.
	 *
	 */
	preparePermissionsForType(permissions, elements, type) {
		let promises = [];
		elements.forEach(element => {
			promises.push(permissions.addGroup(Group.guestId(), type, element._id, "GET"));
			promises.push(permissions.addGroup(Group.userId(), type, element._id, "PUT"));
			promises.push(permissions.addGroup(Group.userId(), type, element._id, "DELETE"));
			promises.push(permissions.addGroup(Group.userId(), type, null, "POST"));
		});
		return Promise.all(promises);
	}
}

module.exports = CreateDefaultUserAndGroup;