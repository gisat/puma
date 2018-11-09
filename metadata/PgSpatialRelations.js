const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgSpatialRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgSpatialRelations');

		this._legacy = false;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`scope`,
			`period`,
			`place`,
			`scenario`
		]
	}

	getTypeKeyColumnName(type) {
		switch (type) {
			case 'place':
				return 'place_id';
			case 'scope':
				return 'scope_id';
			case 'period':
				return 'period_id';
			case 'scenario':
				return 'scenario_id';
			default:
				return type;
		}
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