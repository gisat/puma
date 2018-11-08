const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgAttributeRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgAttributeRelations');

		this._legacy = false;
		this._checkPermissions = true;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();
	}

	static collectionName() {
		return null;
	}

	static groupName() {
		return 'attribute';
	}

	static tableName() {
		return `attribute_relation`;
	}
}

module.exports = PgAttributeRelations;