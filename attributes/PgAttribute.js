var logger = require('../common/Logger').applicationWideLogger;

class PgAttribute {
    constructor(pgPool, schema, table, name) {
        this._table = table;
        this._name = name;
        this._pgPool = pgPool;
        this._schema = schema;
    }

    min() {
        var sql = `SELECT min(${this._name}) FROM ${this._schema}.${this._table}`;

        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#min No result found Name ${this._name}`);
            } else {
                return results.rows[0].min;
            }
        })
    }

    max() {
        var sql = `SELECT max(${this._name}) FROM ${this._schema}.${this._table}`;

        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#max No result found Name ${this._name}`);
            } else {
                return results.rows[0].max;
            }
        })
    }

    values() {
        var sql = `SELECT ${this._name} AS value FROM ${this._schema}.${this._table} GROUP BY value`;

        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#values No result found Name ${this._name}`);
            }

            return results.rows.map(row => row.value);
        });
    }

    filtered(value, areaTemplate, location) {
        var sql;

        if(value.length) {
            // Numeric value
            sql = `SELECT ${this._name} AS value, MAX(value) as minimum, MIN(value) as maximum, gid FROM ${this._schema}.${this._table} 
                WHERE minimum > ${value[0]} AND maximum < ${value[1]}`;
        } else {
            sql = `SELECT ${this._name} AS value, gid FROM ${this._schema}.${this._table} 
                WHERE value = ${value}`;
        }

        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#json No result found Name ${this._name} `);
            }

            return results.rows.map(row => {
                return {
                    gid: row.gid,
                    at: areaTemplate,
                    loc: location
                }
            });
        });
    }

    json() {
        var sql = `SELECT ${this._name} AS value FROM ${this._schema}.${this._table}`;
        return this._pgPool.pool().query(sql).then(results => {
            if(!results.rows.length) {
                logger.warn(`PgAttribute#json No result found Name ${this._name}`);
            }

            return results.rows.map(row => row.value);
        });
    }
}

module.exports = PgAttribute;