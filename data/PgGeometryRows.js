var PgRows = require('./PgRows');
var PgGeometryCachedRow = require('./PgGeometryCachedRow');

class PgGeometryRows {
    constructor(schema, table, pgPool, geometryColumnName, idColumn) {
        this._pgRows = new PgRows(schema, table, idColumn, pgPool);

        this._geometryColumnName = geometryColumnName;
        this._schema = schema;
        this._table = table;
        this._pgPool = pgPool;
    }

    all() {
        return this._pgRows.all().then(rows => {
            var geometryRows = [];

            rows.forEach(row =>{
                geometryRows.push(
                    new PgGeometryCachedRow(row, this._schema, this._table, this._geometryColumnName, this._pgPool)
                );
            });

            return geometryRows;
        })
    }

    addColumn(name, type) {
        return this._pgRows.addColumn(name, type);
    }
}

module.exports = PgGeometryRows;