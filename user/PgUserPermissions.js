const PgCollection = require('../common/PgCollection');

class PgUserPermissions extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema, `PgUserPermissions`);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._permissionResourceTypes = [
			`userPermission`
		];
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "userKey" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "resourceKey" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "permission" TEXT;
		COMMIT;
		`;
	}

	static groupName() {
		return 'userPermissions';
	}

	static tableName() {
		return 'userPermissions';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgUserPermissions;