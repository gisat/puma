var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');
var UUID = require('../common/UUID');
//var uuid = new UUID().toString();

class TacrPhaStatistics {
    constructor (pool) {
        this._pgPool = pool;
        this._table = "tacr_pha_statistics";
        this.check();
    }



    check(){
        let sql = `SELECT * FROM information_schema.tables` +
            ` WHERE table_schema = 'data'` +
            ` AND table_name = '`+ this._table +`';`;

        var self = this;
        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO TacrPhaStatistics#check tableExists: ` + res.rowCount);
            if (res.rowCount == 0){
                self.create(self._table);
            }
        });
    }

    create(name){
        var sql = `CREATE TABLE data.` + name + `(` +
            `uid text,` +
            `ip text,` +
            `keywords text,` +
            `results_number int,` +
            `results_first_record text,` +
            `date timestamp,` +
            `PRIMARY KEY(uid));`;

        logger.info(`INFO TacrPhaStatistics#create sql: ` + sql);

        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO TacrPhaStatistics#create : Table was created succesfully`);
        });
    }

    update(ip, keywords, result){
        let numOfRecords;

        if (result.hasOwnProperty("data")){
            numOfRecords = result.data.length;
            logger.info(`INFO TacrPhaStatistics#update number of records: ` + numOfRecords);
        }

        logger.info(`INFO TacrPhaStatistics#update ip: ` + ip);
        logger.info(`INFO TacrPhaStatistics#update keywords: ` + keywords);
    }
}

module.exports = TacrPhaStatistics;
