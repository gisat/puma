const PgCollection = require('../common/PgCollection');

class PgGroups extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgGroups`);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._allowMultipleRelations = true;

		this._permissionResourceTypes = [
			`group`
		];
	}

	parsePostgresRow(row) {
		let data = {
			...row
		};

		delete data.key;
		delete data.total;

		return {
			key: row.key,
			data
		};
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid(),
			"name" TEXT UNIQUE
		);
		INSERT INTO "${this._pgSchema}"."${this._tableName}" VALUES ('52ddabec-d01a-49a0-bb4d-5ff931bd346e', 'guest') ON CONFLICT (key) DO NOTHING;
		INSERT INTO "${this._pgSchema}"."${this._tableName}" VALUES ('e56f3545-57f5-44f9-9094-2750a69ef67e', 'user') ON CONFLICT (key) DO NOTHING;
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