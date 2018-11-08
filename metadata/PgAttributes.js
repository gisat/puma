const PgCollection = require('../common/PgCollection');

class PgAttributes extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgAttributes`);

		this._legacy = true;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`attribute`
		]
	}

	static collectionName() {
		return 'attribute';
	}

	static groupName() {
		return 'attributes';
	}

	static tableName() {
		return 'attribute';
	}
}

module.exports = PgAttributes;