const PgBaseDataSource = require(`src/dataSources/PgBaseDataSource`)

class PgVector extends PgBaseDataSource {
	constructor(pgSchema) {
		super(`vector`, `vector`, pgSchema);

		this._relevantColumns = [
			`layerName`,
			`tableName`
		];
	}

	getTableSql() {
		return `
		BEGIN;
		
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" UUID PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "layerName" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "tableName" TEXT;
		
		COMMIT;
		`;
	}
}

module.exports = PgVector;