class PgMetadataRelations {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;
	}
}

module.exports = PgMetadataRelations;