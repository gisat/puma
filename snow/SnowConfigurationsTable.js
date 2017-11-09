var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');

var UUID = require('../common/UUID');
var SourceTable = require('../custom_features/SourceTable');

class SnowConfigurationsTable extends SourceTable {
    constructor (pool, name) {
        super(pool, name);
    }

    /**
     * Create table
     * @param name {string} name of the table
     */
    createTable(name){
        var sql = `CREATE TABLE ${config.postgreSqlSchema}.${name}(` +
            `uuid text,` +
            `name text,` +
            `url text,` +
            `user_id integer,` +
            `ts TIMESTAMP,` +
            `PRIMARY KEY(uuid));`;

        logger.info(`INFO PolygonsSourceTable#create sql: ` + sql);

        this._pgPool.query(sql).then(function(res){
            logger.info(`INFO PolygonsSourceTable#create : Table was created succesfully`);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR PolygonsSourceTable#create Error: `, err)
            )
        });
    }

    /**
     * Insert record into table
     * @param data {Object}
     */
    insert(data){
        let keys = ["uuid"];
        let values = [new UUID()];

        for (let key in data){
            if (data.hasOwnProperty(key)){
                keys.push(key);
                values.push(data[key]);
                logger.info(`INFO SourceTable#insert pair: ` + key + `: ` + data[key]);
            }
        }

        var sql = `INSERT INTO ${config.postgreSqlSchema}.${this._tableName} ` +
            `(${keys.join(",")}, ts)` +
            `VALUES` +
            `('${values.join("','")}', CURRENT_TIMESTAMP);`;

        logger.info(`INFO LinesSourceTable#insert sql: ` + sql);
        return this._pgPool.query(sql).then(function(res){
            logger.info(`INFO LinesSourceTable#insert : Record was inserted succesfully`);
            return {
                status: "OK",
                message: "Record inserted succesfully!"
            };
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR LinesSourceTable#insert Error: `, err)
            );
        });
    }

    /**
     * Select all records from table
     * @returns {Promise.<T>}
     */
    selectByUser (params){
        var where = ``;
        if (params){
            where = `WHERE user_id=${params['user_id']}`;
        }

        var sql = `SELECT *, to_char(ts, 'YYYY/DD/MM HH24:MI:SS') as converted_date FROM ${config.postgreSqlSchema}.${this._tableName} ` +
            where +
            ` ORDER BY ts DESC;`;

        logger.info(`INFO SourceTable#selectAll sql: ` + sql);
        return this._pgPool.query(sql).then(function(res){
            return {
                status: "OK",
                message: "Selection successful",
                data: res.rows
            }
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR SourceTable#selectAll Error: `, err)
            )
        });
    }
}

module.exports = SnowConfigurationsTable;