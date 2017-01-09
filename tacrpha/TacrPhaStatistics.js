var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');
var UUID = require('../common/UUID');

class TacrPhaStatistics {
    constructor (pool) {
        this._pgPool = pool;
        this._table = "tacr_pha_statistics";
        this.check();
    }

    /**
     * Check if statistics table exists
     */
    check(){
        let sql = `SELECT * FROM information_schema.tables` +
            ` WHERE table_schema = '${config.postgreSqlSchema}'` +
            ` AND table_name = '`+ this._table +`';`;

        var self = this;
        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO TacrPhaStatistics#check tableExists: ` + res.rowCount);
            if (res.rowCount == 0){
                self.create(self._table);
            }
        });
    }

    /**
     * Create statistics table
     * @param name {string} name of the table
     */
    create(name){
        var sql = `CREATE TABLE ${config.postgreSqlSchema}.` + name + `(` +
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
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR TacrPhaStatistics#create Error: `, err)
            )
        });
    }

    /**
     * Insert record into statistics table
     * @param ip {string}
     * @param keywords {Array} searching keywords
     * @param result {Object} searching results
     */
    insert(ip, keywords, result){
        let numOfRecords = 0;
        let firstRow = "";
        let id = new UUID().toString();
        let timestamp = Date.now();
        let searchString = keywords.toString();

        if (result.hasOwnProperty("data")){
            numOfRecords = result.data.length;
            var first = result.data[0];
            for (var key in first){
                firstRow += key + ": " + first[key] + ", ";
            }
        }

        logger.info(`INFO TacrPhaStatistics#insert id: ` + id);
        logger.info(`INFO TacrPhaStatistics#insert ip: ` + ip);
        logger.info(`INFO TacrPhaStatistics#insert timestamp: ` + timestamp);
        logger.info(`INFO TacrPhaStatistics#insert keywords: ` + searchString);
        logger.info(`INFO TacrPhaStatistics#insert number of records: ` + numOfRecords);
        logger.info(`INFO TacrPhaStatistics#insert first row: ` + firstRow);

        var sql = `INSERT INTO ${config.postgreSqlSchema}.` + this._table + ` ` +
            `(uid, ip, keywords, results_number, results_first_record, date) ` +
            `VALUES` +
            `('` + id + `', '` + ip + `', '` + searchString + `', ` + numOfRecords + `, '` + firstRow + `', now());`;

        logger.info(`INFO TacrPhaStatistics#insert sql: ` + sql);
        this._pgPool.pool().query(sql).then(function(res){
            logger.info(`INFO TacrPhaStatistics#insert : Record was inserted succesfully`);
        }).catch(err => {
            throw new Error(
                logger.error(`ERROR TacrPhaStatistics#insert Error: `, err)
            )
        });
    }

    /**
     * Get statistics about searching string
     * @returns {*}
     */
    getSearchStringFrequency(type){
        var where = "";
        if (type == "successful"){
            where = ` WHERE results_number > 0 `;
        }

        var sql = `SELECT keywords, COUNT(keywords) as num FROM ${config.postgreSqlSchema}.` + this._table + where + ` GROUP BY keywords ORDER by num DESC;`;
        logger.info(`INFO TacrPhaStatistics#getKeywordsFrequency sql: ` + sql);

        return this._pgPool.pool().query(sql);
    }
}

module.exports = TacrPhaStatistics;
