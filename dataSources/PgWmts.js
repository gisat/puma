const PgBaseDataSource = require(`./PgBaseDataSource`)

class PgWmts extends PgBaseDataSource {
	constructor(pgSchema) {
		super(`wmts`, `wmts`, pgSchema);

		this._relevantColumns = [
			`urls`,
			`params`
		];
	}

	getTableSql() {
		return `
		BEGIN;
		
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			"key" UUID PRIMARY KEY DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "urls" TEXT[];
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS "params" JSONB;
		COMMIT;
		`;
	}
}

module.exports = PgWmts;