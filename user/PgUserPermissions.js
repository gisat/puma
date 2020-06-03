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
			"userKey" UUID REFERENCES "${this._pgSchema}"."users"("key") ON DELETE CASCADE,
			"permissionKey" UUID REFERENCES "${this._pgSchema}"."permissions"("key") ON DELETE CASCADE,
			PRIMARY KEY("userKey", "permissionKey")
		);
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