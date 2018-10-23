const PgCollection = require('../common/PgCollection');

class PgDataviewsLegacy extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgDataviewsLegacy`);

		this._legacy = true;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
		    `dataview`
		]
	}

	static collectionName() {
		return 'dataview';
	}

	static groupName() {
		return 'dataviews';
	}

	static tableName() {
		return 'dataview';
	}
}

module.exports = PgDataviewsLegacy;