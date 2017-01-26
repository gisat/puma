var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');


var UUID = require('../common/UUID');
var SourceTable = require('./SourceTable');

class PolygonsSourceTable extends SourceTable {
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
            `geometry text,` +
            `scope text,` +
            `place text,` +
            `user_name text,` +
            `PRIMARY KEY(uuid));`;

        logger.info(`INFO PolygonsSourceTable#create sql: ` + sql);

        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO PolygonsSourceTable#create : Table was created succesfully`);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR PolygonsSourceTable#create Error: `, err)
            )
        });
    }
}

module.exports = PolygonsSourceTable;
