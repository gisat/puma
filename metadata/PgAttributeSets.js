const PgCollection = require('../common/PgCollection');

class PgAttributeSets extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgAttributeSets`);

		this._legacy = true;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`attributeset`
		]
	}

	static collectionName() {
		return 'attributeset';
	}

	static groupName() {
		return 'attributesets';
	}

	static tableName() {
		return 'attribute_set';
	}
}

module.exports = PgAttributeSets;