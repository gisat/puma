_ = require('lodash');

class GeometryToPsql {
    constructor(pool) {
        this._pgPool = pool;
    }
    
    prepareGeometryTable(name) {
        name = name || `imported_${Date.now()}`;
        return this._pgPool.pool().query(
            `CREATE TABLE "${name}" (
                    ID SERIAL PRIMARY KEY,
                    the_geom geometry
                );`
        ).then(() => {
            return name;
        });
    }
    
    addWktGeometryToTable(tableName, wktGeometries, projection) {
        let sql = this.getInsertSqlFromListOfWktGeometries(tableName, wktGeometries, projection);
        console.log(sql);
        return this._pgPool.pool().query(sql);
    }
    
    getInsertSqlFromListOfWktGeometries(tableName, wktGeometries, projection) {
        let sql = ['BEGIN;'];
        _.each(wktGeometries, wktGeometry => {
            sql.push(`INSERT INTO ${tableName} (the_geom) VALUES (ST_GeomFromText('${wktGeometry}', ${projection}));`);
        });
        sql.push('COMMIT;');
        return sql.join("\r\n");
    }
}

module.exports = GeometryToPsql;