const PgCollection = require('../common/PgCollection');

class PgPlaces extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgPlaces`);

		this._legacy = true;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
		    `place`,
			`location`
		]
	}

	static collectionName() {
		return 'location';
	}

	static groupName() {
		return 'places';
	}

	static tableName() {
		return 'place';
	}
}

module.exports = PgPlaces;