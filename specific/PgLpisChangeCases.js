const moment = require(`moment`);

const PgCollection = require('../common/PgCollection');

const config = require(`../config`);

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

		this._allowAttachments = true;
	}

	getCurrentWeekCaseCount() {
		let currentWeekStart = moment().startOf('isoWeek').toISOString();
		let sql = `SELECT count(*) FROM (SELECT resource_key, array_agg(change->>'status') AS changes FROM "${config.pgSchema.data}"."metadata_changes" WHERE changed >= '${currentWeekStart}' GROUP BY resource_key) AS sub WHERE NOT changes @> array['${config.projectSpecific.szifLpisZmenovaRizeni.currentWeekLimit.ne}'] and changes @> array['${config.projectSpecific.szifLpisZmenovaRizeni.currentWeekLimit.eq}'];`;
		console.log(sql);
		return this._pgPool
			.query(
				sql
			)
			.then((pgResult) => {
				return Number(pgResult.rows[0].count);
		});
	}

	populatePayloadWithAdditionalData(payload) {
		return this
			.getCurrentWeekCaseCount()
			.then((count) => {
				payload.other = {
					[this._tableName]: {
						weekCaseCount: count
					}
				};
			})
	}

	populateObjectWithAdditionalData(object, user) {
		let changes = [];
		let attachments = [];

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
			.then(() => {
				return this.getCaseAttachments(object.key);
			})
			.then((attachments) => {
				if (attachments) {
					object.attachments = attachments;
				}
			})
	}

	getCaseChanges(caseKey, user) {
		let isGisatUser = false;
		_.each(user.groups, (group) => {
			if (config.projectSpecific.szifLpisZmenovaRizeni.gisatGroupIds.includes(group.id)) {
				isGisatUser = true;
			}
		});

		let sql = `(SELECT "changed", "changed_by" AS "userId", "change"->>'status' AS "status" FROM "${config.pgSchema.data}"."metadata_changes" WHERE "resource_key" = '${caseKey}' AND "change"->>'status' IS NOT NULL ORDER BY changed LIMIT 1 )`
			+ ` UNION `
			+ `(SELECT "changed", "changed_by" AS "userId", "change"->>'status' AS "status" FROM "${config.pgSchema.data}"."metadata_changes" WHERE "resource_key" = '${caseKey}' AND "change"->>'status' IS NOT NULL AND changed_by NOT IN (SELECT user_id FROM data.group_has_members WHERE group_id = ${config.projectSpecific.szifLpisZmenovaRizeni.gisatUserGroupId}) ORDER BY changed DESC LIMIT 1);`;

		if (isGisatUser) {
			sql = `(SELECT "changed", "changed_by" AS "userId", "change"->>'status' AS "status" FROM "${config.pgSchema.data}"."metadata_changes" WHERE "resource_key" = '${caseKey}' AND "change"->>'status' IS NOT NULL ORDER BY changed LIMIT 1 )`
				+ ` UNION `
				+ `(SELECT "changed", "changed_by" AS "userId", "change"->>'status' AS "status" FROM "${config.pgSchema.data}"."metadata_changes" WHERE "resource_key" = '${caseKey}' AND "change"->>'status' IS NOT NULL ORDER BY changed DESC LIMIT 1);`;
		}

		return this._pgPool
			.query(sql)
			.then((pgResult) => {
				if (pgResult.rows.length) {
					return pgResult.rows;
				}
			});
	}

	getCaseAttachments(caseKey) {
		return this._pgPool
			.query(`SELECT * FROM "${config.pgSchema.various}"."attachments" WHERE "relatedResourceKey" = '${caseKey}' ORDER BY "created"`)
			.then((pgResult) => {
				return _.map(pgResult.rows, (row) => {
					return {
						key: row.key,
						data: {
							attachmentKey: row.attachmentKey,
							filename: row.originalName
						}
					}
				})
			})
			.then((attachments) => {
				if (attachments.length) {
					return attachments;
				}
			})
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