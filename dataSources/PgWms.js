const PgBaseDataSource = require(`./PgBaseDataSource`)

class PgWms extends PgBaseDataSource {
	constructor(pgSchema) {
		super(`wms`, `wms`, pgSchema);

		this._relevantColumns = [
			`url`,
			`layers`,
			`styles`,
			`configuration`
		];
	}

	getTableSql() {
		return `
		BEGIN;
		
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" UUID PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "url" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "layers" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "styles" TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "params" JSONB;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "configuration" JSONB;
		
		COMMIT;
		`;
	}
}

module.exports = PgWms;