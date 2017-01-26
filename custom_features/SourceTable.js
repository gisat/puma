var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var UUID = require('../common/UUID');

/**
 * Basic class for table with source data
 */
class SourceTable {
    constructor (pool, name) {
        this._pgPool = pool;
        this._tableName = name;
        this.checkIfExists();
    }

    /**
     * Check if table for custom lines exists
     */
    checkIfExists (){
        let sql = `SELECT * FROM information_schema.tables` +
            ` WHERE table_schema = '${config.postgreSqlSchema}'` +
            ` AND table_name = '${this._tableName}';`;

        var self = this;
        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO SourceTable#check tableExists: ` + res.rowCount);
            if (res.rowCount == 0){
                self.createTable(self._tableName);
            }
        });
    }

    /**
     * Select records from table
     * @returns {Promise.<T>}
     */
    select (params){
        var where = ``;
        if (params){
            where += `WHERE `;
            for (var key in params){
                where += key + `='${params[key]}' AND `;
            }
            where = where.slice(0,-4);
        }

        var sql = `SELECT * FROM ${config.postgreSqlSchema}.${this._tableName} ` +
            where +
            `ORDER BY name DESC;`;

        logger.info(`INFO SourceTable#selectAll sql: ` + sql);
        return this._pgPool.pool().query(sql).then(function(res){
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

    /**
     * Insert record into table
     * @param data {Object}
     */
    insert(data){
        // TODO SQL injection
        let keys = [];
        let values = [];

        for (let key in data){
            if (data.hasOwnProperty(key)){
                keys.push(key);
                values.push(data[key]);
                logger.info(`INFO SourceTable#insert pair: ` + key + `: ` + data[key]);
            }
        }

        var sql = `INSERT INTO ${config.postgreSqlSchema}.${this._tableName} ` +
            `(${keys.join(",")})` +
            `VALUES` +
            `('${values.join("','")}');`;

        logger.info(`INFO LinesSourceTable#insert sql: ` + sql);
        return this._pgPool.pool().query(sql).then(function(res){
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
     * Delete record from table
     * @returns {Promise.<T>}
     */
    deleteRecord (params){
        var sql = `DELETE FROM ${config.postgreSqlSchema}.${this._tableName} WHERE uuid='${params.id}'`;

        logger.info(`INFO SourceTable#deleteRecord sql: ` + sql);
        return this._pgPool.pool().query(sql).then(function(res){
            return {
                status: "OK",
                message: "Record deleted successful"
            }
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR SourceTable#deleteRecord Error: `, err)
            )
        });
    }
}

module.exports = SourceTable;
