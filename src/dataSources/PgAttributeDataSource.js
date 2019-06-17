const _ = require(`lodash`);

const PgCollection = require(`src/common/PgCollection`);

class PgAttributeDataSource extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._keyType = this.constructor.keyType();

		this._basePermissionResourceType = `attributeDataSource`;

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
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "nameInternal" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "attribution" TEXT;		
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "tableName" TEXT;		
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "columnName" TEXT;		
		COMMIT;
		`;
	}

	static groupName() {
		return 'attribute';
	}

	static tableName() {
		return 'attributeDataSource';
	}

	static keyType() {
		return `UUID`;
	}
}

module.exports = PgAttributeDataSource;