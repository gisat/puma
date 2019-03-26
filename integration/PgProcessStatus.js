class PgProcessStatus {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
		this._pgTableName = `lrprocesses`;

		this.initTable();
	}

	updateProcess(uuid, data) {
		return this._pgPool
			.query(`
				INSERT INTO "${this._pgSchema}"."${this._pgTableName}" (uuid, data) VALUES ($1, $2)
				ON CONFLICT (uuid)
				DO UPDATE SET data = $2;
			`, [uuid, data]);
	}

	getProcess(uuid) {
		return this._pgPool
			.query(`
				SELECT * FROM "${this._pgSchema}"."${this._pgTableName}" WHERE uuid = '${uuid}'
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
					uuid uuid primary key default gen_random_uuid(),
					data jsonb
				);
			`)
			.catch((error) => {
				console.log(error);
			})
	}
}

module.exports = PgProcessStatus;