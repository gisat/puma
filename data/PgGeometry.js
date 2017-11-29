class PgGeometry {
	constructor(pgPool, schema, table, geometryColumn, optionalColumns) {
		this._pgPool = pgPool;
		this._schema = schema;
		this._table = table;
		this._geometryColumn = geometryColumn;
		this._optionalColumns = optionalColumns;
	}

	json() {
		let query = [];

		query.push(`SELECT`);
		query.push(`ST_AsGeojson("${this._geometryColumn}") AS geometry`);

		for(let columnKey in this._optionalColumns) {
			query.push(`,"${this._optionalColumns[columnKey]}" AS ${columnKey}`);
		}

		query.push(`FROM "${this._schema}"."${this._table}";`);

		return this._pgPool.query(query.join(` `))
			.then((result) => {
				return result.rows;
			});
	}
}

module.exports = PgGeometry;