const PgCollection = require('../common/PgCollection');

class PgLpisCheckCases extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgLpisCheckCases`);

		this._schema = schema;

		this._legacy = false;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._legacyDataPath = "";

		this._permissionResourceTypes = [
		    `lpischeck_case`
		];

		this._customSqlColumns = `, ST_AsGeoJSON(geometry, 15, 4) AS geometry`;
	}

	tableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._schema}"."${this._tableName}" (
			id SERIAL PRIMARY KEY,
			uuid UUID DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS stav TEXT;
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS nkod_dpb TEXT;
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS kulturakod TEXT;
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS poznamka TEXT;
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS typ TEXT;
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS geometry GEOMETRY;
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS visited BOOLEAN;
		ALTER TABLE "${this._schema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
		COMMIT;
		`;
	}

	static collectionName() {
		return 'lpischeck_case';
	}

	static groupName() {
		return 'lpischeck_cases';
	}

	static tableName() {
		return 'lpischeck_case';
	}
}

module.exports = PgLpisCheckCases;