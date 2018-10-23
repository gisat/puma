const PgCollection = require('../common/PgCollection');

class PgScopes extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgScopes`);

		this._legacy = true;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`scope`,
			`dataset`
		];
	}

	static collectionName() {
		return 'dataset';
	}

	static groupName() {
		return 'scopes';
	}

	static tableName() {
		return 'scope';
	}
}

module.exports = PgScopes;