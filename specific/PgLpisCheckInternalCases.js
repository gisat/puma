const PgCollection = require('../common/PgCollection');

class PgLpisCheckInternalCases extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._basePermissionResourceType = `lpisCheckInternalCase`;

		this._permissionResourceTypes = [
			this._basePermissionResourceType
		];

		this._customSqlColumns = `, ST_AsGeoJSON(ST_Transform(geometry, 4326), 15, 4) AS geometry`;
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "lpisKultura" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chyba" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chybaKategorie" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chybaTyp" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chybaNote" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "quarter" SMALLINT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "stav" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "geometry" GEOMETRY;
		COMMIT;
		`;
	}

	static groupName() {
		return 'lpisCheckInternalCases';
	}

	static tableName() {
		return 'lpisCheckInternalCases';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgLpisCheckInternalCases;