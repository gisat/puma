var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var pg = require('pg');
var util = require('util');

var logger = require('../common/Logger').applicationWideLogger;

function getData(params, callback) {


	var areas = JSON.parse(params['areas']);
	var aggregateFeatureTemplate = parseInt(params['aggregateFeatureTemplate']);
	var years = JSON.parse(params['years']);

	var locationId = null;
	var areaId = null;
	var gids = null;
	for (var locId in areas) {
		locationId = parseInt(locId);
		for (var arId in areas[locationId]) {
			areaId = parseInt(arId);
			gids = areas[locationId][areaId];
			break;
		}
		break;
	}
	var areaTemplates = [aggregateFeatureTemplate, areaId];
	var dbFilter = {
		areaTemplate: {$in: areaTemplates}, location: locationId, year: years[0], isData: false
	};
	//console.log(dbFilter);
	var opts = {
		layerRefMap: function(asyncCallback) {
			crud.read('layerref', dbFilter, function(err, resls) {
				if (err) {
					logger.error("dataspatial#getData Read layerref. Error: ", err);
					return callback(err);
				}
				if (!resls.length) {
					logger.error("dataspatial#getData Read layerref. No data returned. Filter: ", dbFilter);
					return callback(new Error('notexistingdata (3)'));
				}
				var layerRefMap = {};
				for (var i = 0; i < resls.length; i++) {
					var layerRef = resls[i];
					if (!layerRef.fidColumn) {
						continue;
					}
					var areaTemplate = layerRef.areaTemplate;
					layerRefMap[areaTemplate] = layerRef;
				}
				return asyncCallback(null, layerRefMap);

			})
		},
		aggregateLayer: ['layerRefMap', function(asyncCallback, results) {
				var aggregateLayerRef = results.layerRefMap[aggregateFeatureTemplate];
				if (!aggregateLayerRef) {
					return callback(new Error('notexistingdata (4)'));
				}
				// NOTE:
				// Due to dbFilter we always obtain references to source tables (layer source data).
				// Any pumas own derived tables are filtered out, eg. tables from the schema 'analysis'.
				// So we must take into account that geometry column of the source table may be of whatever name.
				var aggTableName = conn.getLayerTable(aggregateLayerRef.layer);
				conn.getGeometryColumnName(aggTableName).then(function (aggGeomColName) {
					var sql = util.format('SELECT ST_SRID(%s) as srid FROM %s LIMIT 1', aggGeomColName, aggTableName);
					var client = conn.getPgDataDb();
					client.query(sql, function(err, resls) {
						if (err) {
							logger.error(util.format("dataspatial#getData Sql. %s Error: %s", sql, err));
							return callback(err);
						}
						return asyncCallback(null, {srid: resls.rows[0]['srid'], layerRef: aggregateLayerRef});
					});
				}).catch(function (err) {
					return callback(err);
				});
	
			}],
		result: ['aggregateLayer', function(asyncCallback, results) {
				//console.log('here');
				var unitLayerRef = results.layerRefMap[areaId];
				if (!unitLayerRef && areaId != -1) {
					return callback(new Error('notexistingdata (5)'));
				}
				var unitLayerName = areaId != -1 ? (unitLayerRef.layer.split(':')[1]) : ('up.base_user_' + params['userId'] + '_loc_' + locationId);
				var unitLayerGid = areaId != -1 ? ('"'+unitLayerRef.fidColumn+'"') : 'gid';
				var processClient = new pg.Client(conn.getPgConnString());
				processClient.connect();
				var aggregateLayerRef = results.aggregateLayer.layerRef;

				// NOTE:
				// Due to dbFilter and aggregateLayer() we are always working with source tables (layer source data).
				// So we must take into account that geometry column of the source table may be of whatever name.
				// In case of unitLayerName, this is only true if also areaId != -1.
				var aggTableName = conn.getLayerTable(aggregateLayerRef.layer);
				var aggGeomColName = null;
				var unitTableName = conn.getLayerTable(unitLayerRef.layer);
				var unitGeomColName = null;
				conn.getGeometryColumnName(aggTableName).then(function (colName) {
					aggGeomColName = colName;
					if (areaId != -1) {
						return conn.getGeometryColumnName(unitTableName);
					} else {
						return "the_geom";
					}
				}).then(function (colName) {
					unitGeomColName = colName;
					var sql = 'SELECT COUNT(DISTINCT a."'+aggregateLayerRef.fidColumn+'") as cnt';
					sql += ' FROM ' + aggregateLayerRef.layer.split(':')[1] + ' a';
					sql += util.format(' JOIN %s b ON ST_Intersects(a.%s, ST_Transform(b.%s, %s))',
					                   unitTableName, aggGeomColName, unitGeomColName, results.aggregateLayer.srid);
					if (gids.length) {
						sql += ' WHERE b.'+unitLayerGid+' IN (' + gids.join(',') + ')';
					}
					//console.log(sql);
					processClient.query(sql, function(err, resls) {
						processClient.end();
						if (err) {
							logger.error("dataspatial#getData result Sql. ", sql, " Error: ", err);
							return callback(err);
						}
						return callback(null, resls.rows[0].cnt);
					})
				}).catch(function (err) {
					return callback(err);
				});

			}]
	};

	async.auto(opts);

}

module.exports = {
	getData: getData
};
