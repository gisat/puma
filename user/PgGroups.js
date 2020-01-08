const PgCollection = require('../common/PgCollection');

class PgGroups extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgGroups`);

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._permissionResourceTypes = [
			`group`
		];
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
				password: undefined,
				created: undefined,
				created_by: undefined,
				changed: undefined,
				changed_by: undefined
			}
		}
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "name" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "key" ${this._keyType} DEFAULT gen_random_uuid();
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "id" SERIAL;
		COMMIT;
		`;
	}

	static groupName() {
		return 'groups';
	}

	static tableName() {
		return 'groups';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgGroups;