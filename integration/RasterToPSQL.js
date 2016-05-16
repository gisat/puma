var Promise = require('promise');
var cp = require('child_process');
var path = require('path');

var logger = require('../common/Logger').applicationWideLogger;

/**
 * @param psqlDB - PSQL connection
 * @param rasterFileLocation - Input raster file
 * @param psqlRasterTable - Output PSQL table
 * @param sqlFileLocation - Output SQL file
 * @constructor
 */
var RasterToPSQL = function(psqlDB, rasterFileLocation, psqlRasterTable, sqlFileLocation) {
	this.rasterFileLocation = rasterFileLocation;
	this.sqlFileLocation = sqlFileLocation;
	this.psqlRasterTable = psqlRasterTable;
	this.psqlRasterTileSize = "200x200";
};

/**
 * process raster2psql with given raster file
 * @returns {Promise} promise resolves when execution finished
 */
RasterToPSQL.prototype.process = function(){
	logger.trace('RasterToPSQL#process Start processing of the raster', this.rasterFileLocation);

	var self = this;
	return new Promise(function(resolve, reject){
		var command = "raster2pgsql";
		command += " -c"; // create table
		command += " -C"; // apply raster constraints
		command += " -t " + self.psqlRasterTileSize; // split to tiles
		command += " -F " + self.rasterFileLocation; // input raster file location
		command += " " + self.psqlRasterTable; // result table name
		command += " > " + self.sqlFileLocation; // result SQL file name
		logger.info("RasterToPSQL#process, running raster2psql command: ", command);
		cp.exec(command, {}, function(err, stdout, stderr) {
			if(err) {
				logger.error("RasterToPSQL#process, Error at raster2psql. err:", err);
				reject(err);
			}

			logger.info("RasterToPSQL#process raster2sql stderr:\n", stderr, "\n");
			resolve();
		});
	});
};

module.exports = RasterToPSQL;