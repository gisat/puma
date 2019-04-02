const PgCollection = require('../common/PgCollection');

class PgPlaces extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._basePermissionResourceType = `place`;

		this._permissionResourceTypes = [
			this._basePermissionResourceType
		];

		this._customSqlColumns = `, ST_AsGeoJSON(geometry) AS geometry, ST_AsGeoJSON(bbox) AS bbox`;
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "nameDisplay" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "nameInternal" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "description" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "geometry" GEOMETRY;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "bbox" GEOMETRY;
		COMMIT;
		`;
	}

	mutatePostgresRowToJsFriendly(row) {
		if (row.geometry && _.isString(row.geometry)) {
			row.geometry = JSON.parse(row.geometry);
		}

		if (row.bbox && _.isString(row.bbox)) {
			row.bbox = JSON.parse(row.bbox);
		}
	}

	static groupName() {
		return 'places';
	}

	static tableName() {
		return 'place';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgPlaces;