var Promise = require('promise');
var util = require('util');

var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');

var Location = function(center){
	this.auLayerTable = "views.layer_6353";
	this.auLayerTableGeometryColumn = "the_geom";
	this.centerLon = center.yWgs;
	this.centerLat = center.xWgs;
};

Location.prototype.location = function(){

	var sql = util.format("SELECT gid, name FROM %s au WHERE ST_Contains(au.%s, 'POINT(%s %s)'::geography::geometry) LIMIT 1;",
		this.auLayerTable, this.auLayerTableGeometryColumn, this.centerLon, this.centerLat);

	var self = this;
	return new Promise(function(resolve, reject){
		conn.getPgDataDb().query(sql, function(error, results){
			if(error) {
				throw new Error(
					logger.error('Location#location Error with SQL: ', sql, " Error: ", error)
				);
			}
			var place = results.rows[0];
			logger.info("Location#location, For point lon:", self.centerLon, "lat:", self.centerLat, "found place: ", place.gid, "/", place.name);
			resolve(place.gid);
		});
	});

};

module.exports = Location;