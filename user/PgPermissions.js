const PgCollection = require('../common/PgCollection');

class PgPermissions extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema, `PgPermissions`);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._permissionResourceTypes = [
			`permission`
		];
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "resourceKey" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "permission" TEXT;
		COMMIT;
		`;
	}

	static groupName() {
		return 'permissions';
	}

	static tableName() {
		return 'permissions';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgPermissions;