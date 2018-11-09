const PgCollection = require('../common/PgCollection');

class PgPeriods extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgPeriods`);

		this._legacy = true;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`year`,
			`period`
		]
	}

	static collectionName() {
		return 'year';
	}

	static groupName() {
		return 'periods';
	}

	static tableName() {
		return 'period';
	}
}

module.exports = PgPeriods;