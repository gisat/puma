const PgCollection = require('../common/PgCollection');

const config = require('../config');

class PgLpisCheckInternalCases extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema);

		// this._checkPermissions = false;

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
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "kodDpb" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "lpisKultura" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chyba" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chybaKategorie" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chybaTyp" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "chybaNote" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "quarter" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "status" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "geometry" GEOMETRY;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "workerKey" TEXT;
		COMMIT;
		`;
	}

	populateObjectWithAdditionalData(object, user) {
		let changes = [];
		let attachments = [];

		object.data.geometry = JSON.parse(object.data.geometry);

		return Promise
			.resolve()
			.then(() => {
				return this.getCaseChanges(object.key, user);
			})
			.then((changes) => {
				if (changes) {
					object.changes = changes;
				}
			})
	}

	getCaseChanges(caseKey, user) {
		let sql = `(SELECT "changed", "changed_by" AS "userId", "change"->>'status' AS "status" FROM "${config.pgSchema.data}"."metadata_changes" WHERE "resource_key" = '${caseKey}' AND "change"->>'status' IS NOT NULL ORDER BY changed LIMIT 1 )`
			+ ` UNION `
			+ `(SELECT "changed", "changed_by" AS "userId", "change"->>'status' AS "status" FROM "${config.pgSchema.data}"."metadata_changes" WHERE "resource_key" = '${caseKey}' AND "change"->>'status' IS NOT NULL AND changed_by NOT IN (SELECT user_id FROM data.group_has_members WHERE group_id = ${config.projectSpecific.szifLpisZmenovaRizeni.gisatUserGroupId}) ORDER BY changed DESC LIMIT 1);`;

		return this._pgPool
			.query(sql)
			.then((pgResult) => {
				if (pgResult.rows.length) {
					return pgResult.rows;
				}
			});
	}

	static groupName() {
		return 'lpisCheckInternalCases';
	}

	static tableName() {
		return 'lpisCheckInternalCase';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgLpisCheckInternalCases;