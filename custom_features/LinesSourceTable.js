var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');
var UUID = require('../common/UUID');

class LinesSourceTable {
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
            logger.info(`INFO LinesSourceTable#check tableExists: ` + res.rowCount);
            if (res.rowCount == 0){
                self.createTable(self._tableName);
            }
        });
    }

    /**
     * Create table
     * @param name {string} name of the table
     */
    createTable(name){
        var sql = `CREATE TABLE ${config.postgreSqlSchema}.${name}(` +
            `uid text,` +
            `name text,` +
            `geometry text,` +
            `user_name text,` +
            `date timestamp,` +
            `scope text,` +
            `PRIMARY KEY(uid));`;

        logger.info(`INFO LinesSourceTable#create sql: ` + sql);

        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO LinesSourceTable#create : Table was created succesfully`);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR LinesSourceTable#create Error: `, err)
            )
        });
    }

    /**
     * Insert record into table
     * @param data {Object}
     */
    insert(data){
        // TODO SQL injection
        let numOfRecords = 0;
        let firstRow = "";

        let uid = data.uuid;
        let name = data.name;
        let geometry = data.geometry;
        let scope = data.scope;

        let user = "admin";
        if (data.hasOwnProperty("userName")){
            user = data.userName;
        }

        logger.info(`INFO LinesSourceTable#insert uid: ` + uid);
        logger.info(`INFO LinesSourceTable#insert name: ` + name);
        logger.info(`INFO LinesSourceTable#insert geometry: ` + geometry);
        logger.info(`INFO LinesSourceTable#insert user: ` + user);
        logger.info(`INFO LinesSourceTable#insert scope: ` + scope);

        var sql = `INSERT INTO ${config.postgreSqlSchema}.${this._tableName} ` +
            `(uid, name, geometry, user_name, date, scope) ` +
            `VALUES` +
            `('${uid}', '${name}', '${geometry}', '${user}', now(), '${scope}');`;

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
            )
        });
    }

    /**
     * Select all records from table
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
            `ORDER BY date DESC;`;

        logger.info(`INFO LinesSourceTable#selectAll sql: ` + sql);
        return this._pgPool.pool().query(sql).then(function(res){
            return {
                status: "OK",
                message: "Selection successful",
                data: res.rows
            }
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR LinesSourceTable#selectAll Error: `, err)
            )
        });
    }

    /**
     * Delete record from table
     * @returns {Promise.<T>}
     */
    deleteRecord (params){
        var sql = `DELETE FROM ${config.postgreSqlSchema}.${this._tableName} WHERE uid='${params.id}'`;

        logger.info(`INFO LinesSourceTable#deleteRecord sql: ` + sql);
        return this._pgPool.pool().query(sql).then(function(res){
            return {
                status: "OK",
                message: "Record deleted successful"
            }
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR LinesSourceTable#deleteRecord Error: `, err)
            )
        });
    }
}

module.exports = LinesSourceTable;
