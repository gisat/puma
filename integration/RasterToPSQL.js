var Promise = require('promise');
var cp = require('child_process');
var path = require('path');
var parse = require('pg-connection-string').parse;

var config = require('../config.js');

var logger = require('../common/Logger').applicationWideLogger;

/**
 * @param psqlDB - PSQL connection
 * @param rasterFileLocation - Input raster file
 * @param psqlRasterTable - Output PSQL table
 * @constructor
 */
var RasterToPSQL = function(psqlDB, rasterFileLocation, psqlRasterTable) {
	this.rasterFileLocation = rasterFileLocation;
	this.psqlRasterTable = psqlRasterTable;
	this.psqlRasterTileSize = "200x200";
};

/**
 * process raster2psql with given raster file
 * @returns {Promise} promise resolves when execution finished
 */
RasterToPSQL.prototype.process = function(){

	// logger doesn't seem to work here, not even logger.error // todo resolve

	console.log('{console} RasterToPSQL#process Start processing of the raster', this.rasterFileLocation);
	logger.trace('{logger} RasterToPSQL#process Start processing of the raster', this.rasterFileLocation);

	var self = this;
	return new Promise(function(resolve, reject){
		var connectionParameters = parse(config.pgDataConnString);
		var command = "raster2pgsql";
		command += " -c"; // create table
		command += " -C"; // apply raster constraints
		command += " -t " + self.psqlRasterTileSize; // split to tiles
		command += " -F " + self.rasterFileLocation; // input raster file location
		command += " " + self.psqlRasterTable; // result table name
		command += " | psql"; // pipe to psql
		command += " -h " + connectionParameters.host;
		command += " -U " + connectionParameters.user;
		command += " -d " + connectionParameters.database;
		console.log("{console} RasterToPSQL#process, running raster2psql command: ", "PGPASSWORD=######## " + command);
		logger.info("{logger} RasterToPSQL#process, running raster2psql command: ", "PGPASSWORD=######## " + command);
		cp.exec("PGPASSWORD=" + connectionParameters.password + " " + command, {}, function(err, stdout, stderr) {
			if(err) {
				console.log("{console} RasterToPSQL#process, Error at raster2psql. err:", err);
				logger.info("{logger} RasterToPSQL#process, Error at raster2psql. err:", err);
				reject(err);
			}
			console.log("{console} RasterToPSQL#process raster2sql stderr:\n", stderr, "\n");
			logger.info("{logger} RasterToPSQL#process raster2sql stderr:\n", stderr, "\n");
			resolve(self.rasterTable);
		});
	});
};

module.exports = RasterToPSQL;