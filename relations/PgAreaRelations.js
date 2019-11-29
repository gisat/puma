const PgCollection = require('../common/PgCollection');

class PgAreaRelations extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema);

		this._checkPermissions = false;

		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._permissionResourceTypes = [
			`scope`,
			`period`,
			`place`,
			`scenario`
		]
	}

	getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
      		"key" UUID PRIMARY KEY DEFAULT gen_random_uuid()
      	);
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "areaTreeKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "areaTreeLevelKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "fidColumn" TEXT;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "parentFidColumn" TEXT;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "spatialDataSourceKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "scopeKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "placeKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "periodKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "caseKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "scenarioKey" UUID;
      	ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "applicationKey" TEXT;
      	COMMIT;
		`
	}

	getTypeKeyColumnName(type) {
		switch (type) {
			case 'place':
				return 'placeKey';
			case 'scope':
				return 'scopeKey';
			case 'period':
				return 'periodKey';
			case 'scenario':
				return 'scenarioKey';
			default:
				return type;
		}
	}

	static groupName() {
		return 'area';
	}

	static tableName() {
		return `areaRelation`;
	}
}

module.exports = PgAreaRelations;