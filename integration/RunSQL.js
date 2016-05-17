var Promise = require('promise');
var cp = require('child_process');
var path = require('path');
var parse = require('pg-connection-string').parse;

var config = require('../config.js');

var logger = require('../common/Logger').applicationWideLogger;

/**
 * @param psqlDB - PSQL connection
 * @param sqlFilePath - Input raster file
 * @constructor
 */
var RunSQL = function(psqlDB, sqlOptions) {
	this.psqlDB = psqlDB;
	this.sqlFilePath = sqlOptions.sqlFilePath;
	this.rasterTableName = sqlOptions.rasterTableName;
};


RunSQL.prototype.process = function(){

	logger.trace('RunSQL#process Start processing of the SQL file', this.sqlFilePath);

	var self = this;
	return new Promise(function(resolve, reject){
		var connectionParameters = parse(config.pgDataConnString);

		var command = "psql";
		// command += " -h " + connectionParameters.host;
		command += " -U " + connectionParameters.user;
		command += " -d " + connectionParameters.database;
		command += " -f " + self.sqlFilePath;

		logger.info("RunSQL#process, running command: ", "PGPASSWORD=######## " + command);
		cp.exec("PGPASSWORD=" + connectionParameters.password + " " + command, {}, function(err, stdout, stderr) {
			if(err) {
				logger.info("RunSQL#process, Error at psql. err:", err);
				reject(err);
			}
			logger.info("RunSQL#process psql stderr:\n", stderr, "\n");
			resolve(self.rasterTableName);
		});
	});
};


module.exports = RunSQL;