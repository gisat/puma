const PgCollection = require('../common/PgCollection');

class PgWmsLayersLegacy extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgWmsLayersLegacy`);

		this._legacy = false;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
		    `wmslayer`
		]
	}

	parsePostgresRow(row) {
		return {
			key: row.key,
			uuid: row.uuid,
			data: {
				...row,
				key: undefined,
				id: undefined,
				uuid: undefined,
				created: undefined,
				created_by: undefined,
				changed: undefined,
				changed_by: undefined
			}
		}
	}

	static collectionName() {
		return 'wms_layers';
	}

	static groupName() {
		return 'wmslayers';
	}

	static tableName() {
		return 'wms_layers';
	}
}

module.exports = PgWmsLayersLegacy;