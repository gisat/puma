class PgProcessStatus {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._pgTableName = `lrprocesses`;

		this.initTable();
	}

	updateProcess(key, data) {
		return this._pgPool
			.query(`
				INSERT INTO "${this._pgSchema}"."${this._pgTableName}" (key, data) VALUES ($1, $2)
				ON CONFLICT (key)
				DO UPDATE SET data = $2;
			`, [key, data]);
	}

	getProcess(key) {
		return this._pgPool
			.query(`
				SELECT * FROM "${this._pgSchema}"."${this._pgTableName}" WHERE key = '${key}'
			`)
			.then((pgResult) => {
				if(pgResult.rows.length) {
					return pgResult.rows[0];
				}
			})
	}

	initTable() {
		return this._pgPool
			.query(`
				CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._pgTableName}" (
					key text primary key default gen_random_uuid(),
					data jsonb
				);
			`)
			.catch((error) => {
				console.log(error);
			})
	}
}

module.exports = PgProcessStatus;