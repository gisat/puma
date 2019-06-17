class PgBaseDataSource {
	constructor(tableName, type, pgSchema) {
		this._pgSchema = pgSchema;
		this._tableName = tableName;
		this._type = type;
		this._relevantColumns = null;
	}

	getTableName() {
		return this._tableName;
	}

	getRelevantColumns() {
		return this._relevantColumns;
	}

	getType() {
		return this._type;
	}

	getTableSql() {
		return null;
	}
}

module.exports = PgBaseDataSource;