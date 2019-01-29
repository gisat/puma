const PgCollection = require('../common/PgCollection');

class PgScopes extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema);

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._basePermissionResourceType = `scope`;

		this._permissionResourceTypes = [
			this._basePermissionResourceType
		];
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" UUID PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "nameDisplay" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "nameInternal" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "description" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "configuration" JSONB;
		COMMIT;
		`;
	}

	static groupName() {
		return 'scopes';
	}

	static tableName() {
		return 'scope';
	}
}

module.exports = PgScopes;