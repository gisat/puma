const PgCollection = require('../common/PgCollection');
const PgMetadataRelations = require('../metadata/PgMetadataRelations');

class PgLpisCheckCases extends PgCollection {
	constructor(pool, schema, mongo, relatedToMetadataTypes) {
		super(pool, schema, mongo, `PgLpisCheckCases`);

		this._pgPool = pool;
		this._pgSchema = schema;

		this._legacy = false;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();
		this._relatedToMetadataTypes = relatedToMetadataTypes;

		this._pgMetadataRelations = new PgMetadataRelations(pool, schema, this._tableName, this._relatedToMetadataTypes);

		this._legacyDataPath = "";

		this._permissionResourceTypes = [
		    this._tableName
		];

		this._customSqlColumns = `, ST_AsGeoJSON(geometry, 15, 4) AS geometry`;

		this._initPgTable();
	}

	_getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			id SERIAL PRIMARY KEY,
			uuid UUID DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS stav TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS nkod_dpb TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS kulturakod TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS poznamka TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS typ TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS geometry GEOMETRY;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS visited BOOLEAN;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
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