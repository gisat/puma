class PgGeometryCachedRow {
    constructor(pgCachedRow, schema, table, geometryColumnName, pgPool) {
        this._pgCachedRow = pgCachedRow;

        this._schema = schema;
        this._table = table;
        this._geometryColumnName = geometryColumnName;
        this._pgPool = pgPool;
    }

    centroid() {
        return this._pgCachedRow.id().then(id => {
            var sql = `SELECT ST_AsText(ST_Centroid(ST_Transform(${this._geometryColumnName}, 4326))) AS centroid 
                FROM ${this._schema}.${this._table}
                    WHERE ${this._pgCachedRow._idColumn} = '${id}'    
            `;

            return this._pgPool.pool().query(sql);
        }).then(results => {
            return results.rows[0].centroid
                .trim()
                .replace('POINT(', '')
                .replace(')', '')
                .replace(' ',',');
        });
    }

    id() {
        return this._pgCachedRow.id();
    }

    column(name) {
        return this._pgCachedRow.column(name);
    }

    add(name, value) {
        return this._pgCachedRow.add(name, value);
    }
}

module.exports = PgGeometryCachedRow;