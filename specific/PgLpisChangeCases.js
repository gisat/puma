const PgCollection = require('../common/PgCollection');

class PgLpisChangeCases extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._basePermissionResourceType = `lpisChangeCase`;

		this._permissionResourceTypes = [
			this._basePermissionResourceType
		];

		this._customSqlColumns = `, ST_AsGeoJSON("geometryBefore") AS "geometryBefore", ST_AsGeoJSON("geometryAfter") AS "geometryAfter"`;
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "submitDate" TIMESTAMP;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "codeDpb" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "codeJi" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "caseKey" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "changeDescription" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "changeDescriptionPlace" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "changeDescriptionOther" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "evaluationResult" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "evaluationDescription" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "evaluationDescriptionOther" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "evaluationUsedSources" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "geometryBefore" GEOMETRY;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "geometryAfter" GEOMETRY;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "status" TEXT;
		COMMIT;
		`;
	}

	static groupName() {
		return 'lpisChangeCases';
	}

	static tableName() {
		return 'lpisChangeCase';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgLpisChangeCases;