const PgCollection = require('../common/PgCollection');

class PgThemes extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgThemes`);

		this._legacy = true;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`theme`
		]
	}

	static collectionName() {
		return 'theme';
	}

	static groupName() {
		return 'themes';
	}

	static tableName() {
		return 'theme';
	}
}

module.exports = PgThemes;