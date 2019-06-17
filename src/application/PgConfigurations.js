const PgCollection = require('../common/PgCollection');

class PgConfigurations extends PgCollection {
	constructor(pool, schema) {
		super(pool, schema);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._basePermissionResourceType = `configuration`;

		this._permissionResourceTypes = [
			this._basePermissionResourceType
		];
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" ${this._keyType} PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "data" jsonb;
		COMMIT;
		`;
	}

	static groupName() {
		return 'configurations';
	}

	static tableName() {
		return 'configuration';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgConfigurations;