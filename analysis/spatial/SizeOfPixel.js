var Promise = require('promise');
var util = require('util');

var logger = require('../../common/Logger').applicationWideLogger;
var connection = require('../../common/conn');

var SizeOfPixel = function(rasterLayerTable) {
	this.rasterLayerTable = rasterLayerTable;
};

SizeOfPixel.prototype.get = function() {
	var sql = util.format("select 100000 * st_pixelheight(rast) as x, 100000 * st_pixelwidth(rast) as y from %s;", this.rasterLayerTable);

	return new Promise(function(resolve, reject){
		connection.getPgDataDb().query(sql, function(error, results) {
			if (error) {
				throw new Error(
					logger.error('SizeOfPixel#get Error with SQL: ', sql, " Error: ", error)
				);
			}

			resolve({
				x: results.rows[0].x,
				y: results.rows[0].y
			})
		})
	})
};

module.exports = SizeOfPixel;