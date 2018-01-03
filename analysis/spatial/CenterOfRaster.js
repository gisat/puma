var conn = require('../../common/conn');
var logger = require('../../common/Logger').applicationWideLogger;

var util = require('util');
var proj4 = require('proj4');

var CenterOfRaster = function(rasterLayerTable){
	this.rasterLayerTable = rasterLayerTable;
};

CenterOfRaster.prototype.center = function() {
	var sql = util.format("SELECT ST_X(center.centroid) as x, ST_Y(center.centroid) as y from (select ST_Centroid(ST_Extent(rast::geometry)) as centroid from %s) as center;", this.rasterLayerTable);
	return new Promise(function(resolve, reject){
		conn.getPgDataDb().query(sql, function(error, results){
			if(error) {
				throw new Error(
					logger.error('CenterOfRaster#center Error with SQL: ', sql, " Error: ", error)
				);
			}
			var result = proj4('EPSG:900913', {
				x: results.rows[0].x,
				y: results.rows[0].y
			});
			result.xWgs = results.rows[0].x;
			result.yWgs = results.rows[0].y;
			
			resolve(result);
		});
	});
};

module.exports = CenterOfRaster;
