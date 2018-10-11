const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgSpatialRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgSpatialRelations');

		this._legacy = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();
	}

	static collectionName() {
		return null;
	}

	static groupName() {
		return 'spatial';
	}

	static tableName() {
		return `spatial_relation`;
	}
}

module.exports = PgSpatialRelations;