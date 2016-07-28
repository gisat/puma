var querystring = require('querystring');
var async = require('async');
var conn = require('../common/conn');
var Timer = require('../common/timer');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

// Fix creation of attributes when they are in the mapping but not in the template.
function recreateLayerDb(layerRef, isUpdate, callback) {

	var crud = require('../rest/crud');
	if (layerRef.toBeDeleted) {
		//console.log('geoserver/layers.js removing');
		return removeLayerDbInternal(layerRef, callback);
	}
	async.waterfall([

			//nacitani base layer ref
			function (asyncCallback) {
				if (!layerRef.isData) {
					return asyncCallback(null, layerRef);
				}
				var filter = {
					'active': {$ne: false},
					'areaTemplate': layerRef.areaTemplate,
					location: layerRef.location,
					isData: false,
					year: layerRef.year
				};
				crud.read('layerref', filter, function (err, results) {
					if (err) {
						logger.error("layers#recreateLayerDb Read layerref. Filter: ", filter, "Error: ", err);
						return asyncCallback(err);
					}
					var result = null;
					for (var i = 0; i < results.length; i++) {
						if (results[i].fidColumn) {
							result = results[i];
							break;
						}
					}
					if (!result) {
						logger.error("layers#recreateLayerDb Noareatemplateref. Filter: ", filter, " Results: ", results, " Error: ", err);
						return asyncCallback(new Error('noareatemplateref'));
					}
					return asyncCallback(null, result)
				})
			},
			// zjisteni navaznych layer ref
			function (baseLayerRef, asyncCallback) {
				var filter = {
					'active': {$ne: false},
					areaTemplate: layerRef.areaTemplate,
					year: layerRef.year,
					location: layerRef.location,
					isData: true
				};
				crud.read('layerref', filter, function (err, results) {
					if (err) {
						logger.error("layers#recreateLayerDb Read linked layerref. Filter: ", filter, "Error: ", err);
						return asyncCallback(err);
					}
					return asyncCallback(null, baseLayerRef, results)
				})
			}
		],
		function (err, baseLayerRef, layerRefs) {
			if (err) {
				logger.error("layers#recreateLayerDb General error: ", err);
				return callback(err);
			}
			return recreateLayerDbInternal(baseLayerRef, layerRefs, layerRef.isData ? false : true, isUpdate, callback);
		}
	)
}

var removeLayerDbInternal = function (areaLayerRef, callback) {
	var viewName = 'views.layer_' + areaLayerRef['_id'];
	var tableName = 'views.base_' + areaLayerRef['_id'];
	var sql = 'DROP VIEW IF EXISTS ' + viewName + ';';
	sql += 'DROP TABLE IF EXISTS ' + tableName + ';';
	var client = conn.getPgDataDb();
	client.query(sql, function (err, results) {
		if (err) {
			logger.error("layers#removeLayerDbInternal SQL: ", sql, " Error: ", err);
			return callback(err);
		}
		callback(null);
	})
};

function checkUniqueId(layerRef, callback) {
	// overeni jedinecnosti ID
	var from = conn.getLayerTable(layerRef.layer);
	var layerName = layerRef.layer.substr(layerRef.layer.indexOf(":") + 1);

	var sql = 'ALTER TABLE ' + from + ' DROP CONSTRAINT IF EXISTS ' + layerName + '_unique;';
	sql += 'ALTER TABLE ' + from + ' ADD CONSTRAINT ' + layerName + '_unique UNIQUE("' + layerRef.fidColumn + '");';

	var client = conn.getPgDataDb();
	//console.log(sql)
	client.query(sql, function (err) {
		if (err) {
			logger.error("layers#checkUniqueId IDs not unique. SQL: ", sql, " Error: ", err);
			return callback(new Error('IDs not unique'));
		}

		callback(null);
	})
}

var recreateLayerDbInternal = function (areaLayerRef, dataLayerRefs, isBase, isUpdate, callback) {
	var layerName = ' views.layer_' + areaLayerRef['_id'];
	var from = conn.getLayerTable(areaLayerRef.layer);
	//console.log(isBase)
	// priprava view
	var sql = 'BEGIN; DROP VIEW IF EXISTS ' + layerName + '; ';
	if (isBase && !isUpdate) {
		var viewName = 'base_' + areaLayerRef['_id'];
		sql += 'CREATE TABLE views.' + viewName + ' AS (SELECT ';
		sql += '"' + areaLayerRef.fidColumn + '" AS gid,';
		sql += 'ST_Centroid(ST_Transform(the_geom,4326)) as centroid,';

		sql += "CASE WHEN ST_Contains(ST_GeometryFromText('POLYGON((-180 -90,180 -90, 180 90,-180 90,-180 -90))',4326),ST_Transform(the_geom,4326))";
		sql += "THEN ST_Area(ST_Transform(the_geom,4326)::geography)";
		sql += "ELSE ST_Area(ST_Intersection(ST_GeometryFromText('POLYGON((-180 -90,180 -90, 180 90,-180 90,-180 -90))',4326),ST_Transform(the_geom,4326))::geography) END as area,";

		sql += "CASE WHEN ST_Contains(ST_GeometryFromText('POLYGON((-180 -90,180 -90, 180 90,-180 90,-180 -90))',4326),ST_Transform(the_geom,4326))";
		sql += "THEN ST_Length(ST_Transform(the_geom,4326)::geography)";
		sql += "ELSE ST_Length(ST_Intersection(ST_GeometryFromText('POLYGON((-180 -90,180 -90, 180 90,-180 90,-180 -90))',4326),ST_Transform(the_geom,4326))::geography) END as length,";

		sql += 'Box2D(ST_Transform(the_geom,4326)) as extent FROM ' + from + ');';
		sql += 'ALTER TABLE views.' + viewName + ' ADD CONSTRAINT ' + viewName + '_unique UNIQUE(gid);'
	}


	sql += 'CREATE VIEW ' + layerName + ' AS SELECT ';
	// select z uzemni vrstvy
	sql += 'a."' + areaLayerRef.fidColumn + '" AS gid,';
	sql += 'a."' + (areaLayerRef.nameColumn || areaLayerRef.fidColumn) + (areaLayerRef.nameColumn ? '"' : '"::VARCHAR') + ' AS name,';
	sql += areaLayerRef.parentColumn ? ('a."' + areaLayerRef.parentColumn + '" AS parentgid,') : 'NULL::integer AS parentgid,';
	sql += 'a.the_geom,';
	sql += 'b.area,';
	sql += 'b.length,';
	sql += 'b.centroid,';
	sql += 'b.extent';
	var attrSql = '';
	var layerMap = {};

	// select z pripojenych vrstev
	var existingAliases = {};
	for (var i = 0; i < dataLayerRefs.length; i++) {
		var layerRef = dataLayerRefs[i];
		var layerAlias = 'l_' + layerRef['_id'];
		if (!layerRef.attributeSet) continue;
		var name = conn.getLayerTable(layerRef.layer);
		layerMap[layerAlias] = {name: name, fid: layerRef.fidColumn};
		for (var j = 0; j < layerRef.columnMap.length; j++) {
			var attrRow = layerRef.columnMap[j];
			var alias = 'as_' + layerRef.attributeSet + '_attr_' + attrRow.attribute;
			var column = layerAlias + '."' + attrRow.column + '"';
			if (existingAliases[alias]) {
				continue;
			}
			existingAliases[alias] = true;
			attrSql += attrSql ? ',' : '';
			attrSql += column + ' AS ' + alias;
		}
	}
	sql += attrSql ? ',' : '';
	sql += attrSql;

	sql += ' FROM ' + from + ' a';
	sql += ' LEFT JOIN views.base_' + areaLayerRef['_id'] + ' b ON a."' + areaLayerRef.fidColumn + '"::text=b."gid"::text';
	// join pripojenych vrstev
	for (var key in layerMap) {
		sql += ' LEFT JOIN ' + layerMap[key].name + ' ' + key + ' ON ';
		sql += 'a."' + areaLayerRef.fidColumn + '"::text=' + key + '."' + layerMap[key].fid + '"::text';
	}

	sql += '; COMMIT;';

	// It is actually necessary that the data in the primary key and elsewhere have the same type otherwise it fails.

	logger.info('geoserver/layers.js start ' + sql);
	var client = conn.getPgDataDb();
	var timer = Timer("geoserver/layers-1");
	client.query(sql, function (err, results) {
		timer();
		if (err) {
			logger.error('layers#recreateLayerDbInternal SQL: ', sql, ' Error: ', err);
			client.query('ROLLBACK;', function () {
				return callback(err);
			});
		} else {
			callback(null, areaLayerRef);
		}
	})
};

function changeLayerGeoserver(layerId, method, callback) {
	var username = config.geoserver2Username;
	var password = config.geoserver2Password;
	var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
	var headers = {
		'Content-type': 'application/json',
		'Authorization': auth
	};
	var name = 'layer_' + layerId;

	var path = method != 'DELETE' ? config.geoserver2Path + '/rest/workspaces/' + config.geoserver2Workspace + '/datastores/views/featuretypes' : config.geoserver2Path + 'rest/layers';
	var data = null;

	if (method == 'POST') {
		path += '.json';
	} else {
		path += '/' + name;
	}
	if (method != 'DELETE') {
		var obj = {
			featureType: {
				name: name,
				nativeName: name,
				title: name,
				enabled: true
			}
		};
		data = JSON.stringify(obj);
	}

	logger.info("layers#changeLayerGeoserver method: " + method);

	var options = {
		host: config.geoserver2Host,
		path: path,
		headers: headers,
		port: config.geoserver2Port,
		method: method
	};
	conn.request(options, data, function (err, output, resl) {
		if (err) {
			logger.error('layers#changeLayerGeoserver Connection options: ', options, ' Error: ', err);
			return callback(err);
		}
		logger.info("layers#changeLayerGeoserver Geoserver i2 request. Output:", output, " Options:", options, " Data:", data);
		return callback();
	});

}


module.exports = {
	recreateLayerDb: recreateLayerDb,
	checkUniqueId: checkUniqueId,
	changeLayerGeoserver: changeLayerGeoserver
};
