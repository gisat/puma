var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var request = require('request');


var UUID = require('../common/UUID');
var SourceTable = require('./SourceTable');

class LinesSourceTable extends SourceTable {
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
            `theme text,` +
            `user_name text,` +
            `PRIMARY KEY(uuid));`;

        logger.info(`INFO LinesSourceTable#create sql: ` + sql);

        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO LinesSourceTable#create : Table was created succesfully`);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR LinesSourceTable#create Error: `, err)
            )
        });
    }
}

module.exports = LinesSourceTable;
