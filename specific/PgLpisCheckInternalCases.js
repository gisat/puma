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
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "confirmed" BOOLEAN DEFAULT FALSE;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "probabilityCategory" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "delivery" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "region" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "changeDate" TIMESTAMP WITH TIME ZONE;
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

	executeCustomDatabaseQuery() {
		return this
			._pgPool
			.query(
					`SELECT count(*)
                     FROM pg_matviews
                     WHERE matviewname = 'metadata_changes_mview'`
			)
			.then((pgResult) => {
				if (pgResult.rows[0].count !== '0') {
					return this
						._pgPool
						.query(
							`REFRESH MATERIALIZED VIEW CONCURRENTLY "data"."metadata_changes_mview"`
						)
				} else {
				}
				return this
					._pgPool
					.query(
						`BEGIN;
						CREATE MATERIALIZED VIEW "data"."metadata_changes_mview" AS SELECT id, "changed", "changed_by", "change"->>'status' AS "status", "resource_key" FROM "data"."metadata_changes";
						CREATE UNIQUE INDEX ON "data"."metadata_changes_mview" (id);
						COMMIT;`
					)
			})
	}

	getCaseChanges(caseKey, user) {
		let sql = `(SELECT "changed", "changed_by" AS "userId", "status" FROM "${config.pgSchema.data}"."metadata_changes_mview" WHERE "resource_key" = '${caseKey}' AND "status" IS NOT NULL ORDER BY changed DESC LIMIT 1 )`
			+ ` UNION `
			+ `(SELECT "changed", "changed_by" AS "userId", "status" FROM "${config.pgSchema.data}"."metadata_changes_mview" WHERE "resource_key" = '${caseKey}' AND "status" IS NOT NULL AND changed_by NOT IN (SELECT user_id FROM data.group_has_members WHERE group_id = ${config.projectSpecific.szifLpisZmenovaRizeni.gisatUserGroupId}) ORDER BY changed DESC LIMIT 1);`;

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