var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');

class PgAttribute {
    constructor(pgPool, schema, table, name) {
        this._table = table;
        this._name = name;
        this._pgPool = pgPool;
        this.schema = schema;
    }

    min() {
        var sql = `SELECT min(${this._name}) FROM ${this.schema}.${this._table}`;

        logger.info(`PgAttribute#min SQL ${sql}`);
        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#min No result found ${this.schema}.${this._table} Name ${this._name}`);
                return null;
            } else {
                return results.rows[0].min;
            }
        })
    }

    max() {
        var sql = `SELECT max(${this._name}) FROM ${this.schema}.${this._table}`;

        logger.info(`PgAttribute#max SQL ${sql}`);
        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#max No result found ${this.schema}.${this._table} Name ${this._name}`);
                return null;
            } else {
                return results.rows[0].max;
            }
        })
    }

    values() {
        var sql = `SELECT ${this._name} AS value FROM ${this.schema}.${this._table} GROUP BY value`;

        logger.info(`PgAttribute#values SQL ${sql}`);
        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#values No result found ${this.schema}.${this._table} Name ${this._name}`);
                return [];
            }

            return results.rows.map(row => row.value);
        });
    }

    filtered(value, areaTemplate, location) {
        var sql;

        if(_.isArray(value)) {
            // Numeric value
            sql = `SELECT ${this._name} AS value, gid, ST_AsText(St_Transform(the_geom, 900913)) as geom FROM ${this.schema}.${this._table} 
                WHERE ${this._name} > ${value[0]} AND ${this._name} < ${value[1]}`;
        } else {
            sql = `SELECT ${this._name} AS value, gid, ST_AsText(St_Transform(the_geom, 900913)) as geom FROM ${this.schema}.${this._table} 
                WHERE ${this._name} = '${value}'`;
        }

        logger.info(`PgAttribute#filtered SQL ${sql}`);
        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#json No result found ${this.schema}.${this._table} Name ${this._name} `);
                return [];
            }

            return results.rows.map(row => {
                return {
                    gid: row.gid,
                    geom: row.geom,
                    at: areaTemplate,
                    loc: location
                }
            });
        });
    }
}

module.exports = PgAttribute;