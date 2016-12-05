var Promise = require('promise');
var validator = require('validator');
var parse = require('wellknown');

/**
 * Select geometry from table by given parameters and convert it to points
 */
class PgGeometryToPoints {
    constructor(options, pgPool) {
        this._table = validator.escape(options.table || "");
        this._geom_column = validator.escape(options.geom_column || "");
        this._fid_column = validator.escape(options.fid_column || "");
        this._fid_value = validator.escape(options.fid_value || "");

        this._pgPool = pgPool;

        return this.getPointsFromGeometry();
    }

    getPointsFromGeometry() {
        if (!this._table || !this._geom_column || !this._fid_column || !this._fid_value) {
            return Promise.resolve();
        }
        var sql = `SELECT ST_AsText("${this._geom_column}") as points FROM ${this._table} WHERE "${this._fid_column}"='${this._fid_value}'`;
        console.log(sql);
        return this._pgPool.pool().query(sql).then(rows => {
            if (rows && rows.rows.length) {
                console.log(`rows`, rows);
                var multipolygon = parse(rows.rows[0].points);
                return multipolygon;
            }
        }).catch(error => {
            console.log(error);
        });
    }
}

module.exports = PgGeometryToPoints;