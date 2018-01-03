var Promise = require('promise');
var cp = require('child_process');
var path = require('path');

var config = require('../config.js');

var logger = require('../common/Logger').applicationWideLogger;

/**
 * @param psqlDB - PSQL connection
 * @param rasterFileLocation - Input raster file
 * @constructor
 */
var RasterToPSQL = function(psqlDB, rasterFileLocation) {
	this.rasterFileLocation = rasterFileLocation;
	this.psqlRasterTileSize = "200x200";
	this.psqlDB = psqlDB;
};

/**
 * process raster2psql with given raster file
 * @returns {Promise} promise resolves when execution finished
 */
RasterToPSQL.prototype.process = function(){

	logger.trace('RasterToPSQL#process Start processing of the raster', this.rasterFileLocation);

	var self = this;
	return new Promise(function(resolve, reject){
		var name = path.parse(self.rasterFileLocation).name;

		getTableName(self.psqlDB, name).then(function(tableName){
			var command = "raster2pgsql";
			command += " -c"; // create table
			command += " -C"; // apply raster constraints
			command += " -t " + self.psqlRasterTileSize; // split to tiles
			command += " -F " + self.rasterFileLocation; // input raster file location
			command += " " + tableName; // result table name
			command += " | ";
			command += " PGPASSWORD=" + config.pgDataPassword;
			command += " psql -h " + config.pgDataHost;
			command += " -p " + config.pgDataPort;
			command += " -U " + config.pgDataUser + " " + config.pgDataDatabase;

			logger.info("RasterToPSQL#process, running raster2psql command: ", command);
			cp.exec(command, {maxBuffer: 1024 * 1024 * 100}, function(err, stdout, stderr) {
				if(err) {
					logger.info("RasterToPSQL#process, Error at raster2psql. err:", err);
					reject(err);
				}
				logger.info("RasterToPSQL#process raster2sql stderr:\n", stderr, "\n");
				resolve(tableName);
			});
		});
	});
};

function getTableName(psqlDB, baseTableName){
	return new Promise(function(resolve, reject){
		tableExists(psqlDB, baseTableName).then(function(doExists){
			if(doExists){
				resolve(getNextTableName(psqlDB, baseTableName + "_001"));
			}else{
				resolve(baseTableName);
			}
		});
	});
}

function getNextTableName(psqlDB, tableName){
	return new Promise(function(resolve, reject){
		tableExists(psqlDB, tableName).then(function(doExists){
			if(doExists){
				var increased = tableName.replace(/\d+$/, function(n){
					var number = ++n;
					return ('00' + number).substring(number.length);
				});
				resolve(getNextTableName(psqlDB, increased));
			}else{
				resolve(tableName);
			}
		});
	});
}

function tableExists(psqlDB, tableName){
	return new Promise(function(resolve, reject){
		psqlDB.query("SELECT relname FROM pg_class WHERE relname = '" + tableName + "' ORDER BY relname;", [], function(err, results){
			if(err){
				throw err;
			}
			if(results.rows.length){
				resolve(true);
			}else{
				resolve(false);
			}
		});
	});
}

module.exports = RasterToPSQL;