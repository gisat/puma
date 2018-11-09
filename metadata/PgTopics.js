const PgCollection = require('../common/PgCollection');

class PgTopics extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgTopics`);

		this._legacy = true;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`topic`
		]
	}

	static collectionName() {
		return 'topic';
	}

	static groupName() {
		return 'topics';
	}

	static tableName() {
		return 'topcic';
	}
}

module.exports = PgTopics;