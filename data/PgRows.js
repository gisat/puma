// Load the data from the postgreSQL database. For each row count the distance to School, Hospital and PublicStops.
// Amount in given area. 1km, 3km, 5km
//
var PgCachedLayerRow = require('./PgCachedRow');
var Promise = require('promise');

class PgLayerRows {
    constructor(schema, table, idColumn, pgPool) {
        this._table = table;
        this._schema = schema;
        this._idColumn = idColumn;

        this._pgPool = pgPool;
    }

    /**
     * It returns all rows in given table
     */
    all() {
        var sql = `SELECT * FROM ${this._schema}.${this._table}`;
        return this._pgPool.query(sql).then(results => {
            var rows = [];
            results.rows.forEach(row => {
                rows.push(new PgCachedLayerRow(row, this._idColumn, this._pgPool))
            });
            return rows;
        });
    }

    addColumn(name, type) {
        // Ignores two tables of the same name in the different schemas. TODO: Fix
        var existsColumn = `SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='${this._table}' and column_name='${type}';`;

        var sql = `ALTER TABLE ${this._schema}.${this._table} ADD COLUMN ${name} ${type}`;

        return this._pgPool.query(existsColumn).then(result => {
            // The column already exists.
            if(result.rows.length > 0) {
                return Promise.resolve(true);
            }

            return this._pgPool.query(sql);
        });
    }
}

module.exports = PgLayerRows;