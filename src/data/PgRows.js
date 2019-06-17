var PgCachedLayerRow = require('./PgCachedRow');

class PgLayerRows {
    constructor(schema, table, idColumn, pgPool) {
        this._table = table;
        this.schema = schema;
        this._idColumn = idColumn;

        this._pgPool = pgPool;
    }

    /**
     * It returns all rows in given table
     */
    all() {
        var sql = `SELECT * FROM ${this.schema}.${this._table}`;
        return this._pgPool.pool().query(sql).then(results => {
            var rows = [];
            results.rows.forEach(row => {
                rows.push(new PgCachedLayerRow(row, this._pgPool, this.schema, this._table, this._idColumn))
            });
            return rows;
        });
    }

    addColumn(name, type) {
        // Ignores two tables of the same name in the different schemas. TODO: Fix
        var existsColumn = `SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='${this._table}' and column_name='${name}';`;

        var sql = `ALTER TABLE ${this.schema}.${this._table} ADD COLUMN ${name} ${type}`;

        return this._pgPool.pool().query(existsColumn).then(result => {
            // The column already exists.
            if(result.rows.length > 0) {
                return true;
            }

            return this._pgPool.pool().query(sql);
        });
    }
}

module.exports = PgLayerRows;