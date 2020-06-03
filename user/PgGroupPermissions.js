const PgCollection = require('../common/PgCollection');

class PgGroupPermissions extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema, `PgGroupPermissions`);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._permissionResourceTypes = [
			`groupPermissions`
		];
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"groupKey" UUID REFERENCES "${this._pgSchema}"."groups"("key") ON DELETE CASCADE,
			"permissionKey" UUID REFERENCES "${this._pgSchema}"."permissions"("key") ON DELETE CASCADE,
			PRIMARY KEY ("groupKey", "permissionKey")
		);
		COMMIT;
		`;
	}

	static groupName() {
		return 'groupPermissions';
	}

	static tableName() {
		return 'groupPermissions';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgGroupPermissions;