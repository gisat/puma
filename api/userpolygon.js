var http = require('http');
var querystring = require('querystring');
var conn = require('../common/conn');
var data = require('../data/data');
var async = require('async');
var crud = require('../rest/crud');
var spatialAgg = require('../analysis/spatialagg');
var geoserverLayers = require('../geoserver/layers');
var us = require('underscore');

function userPolygon(params,req,res,callback) {

	var userId = req.userId;
	if (!userId) {
		return callback('notloggedin');
	}
	var loc = parseInt(params['location']);
	var geom = params['geom'];
	var method = params['method'];
	var id = params['id'];
	var opts = {
		dbRecord: function(asyncCallback) {
			crud.read('userpolygon',{$and:[{location:loc},{user:userId}]},function(err,resls) {
				if (err) return callback(err);
				var conf = resls[0];
				if (!conf) {
					crud.create('userpolygon',{location:loc,user:userId,analysisMap:{},geometries:{},analysisCreated:{},viewsCreated:[],maxGid:0},{userId: userId},function(err,resl) {
						var sql = 'CREATE TABLE up.base_user_'+userId+'_loc_'+loc+' (gid integer,name varchar,the_geom geometry,centroid geometry,area real,length real,extent box2d,dependingid bigint,fromdistance real);';
						var client = conn.getPgDataDb();
						client.query(sql,function(err,results) {
							if (err) return callback(err);
							asyncCallback(null,resl);
						})
					})
				}
				else {
					return asyncCallback(null,conf);
				}

			})
		},
		removeFromTable: ['dbRecord',function(asyncCallback,results) {
			if (method=='create') {
				return asyncCallback(null);
			}
			var conf = results.dbRecord;
			var gids = conf.geometries[id].gids;
			var deleteFrom = ['up.base_user_'+userId+'_loc_'+loc];
			for (var an in conf.analysisMap) {
				for (var year in conf.analysisMap[an]) {
					var tableName = 'up.user_'+userId+'_loc_'+loc+'_an_'+an+'_y_'+year;
					deleteFrom.push(tableName);
					delete conf.analysisMap[an][year][id];
				}
			}
			var sql = '';
			for (var i=0;i<deleteFrom.length;i++) {
				var tableName = deleteFrom[i];
				var tableSql = 'DELETE FROM '+tableName;
				tableSql += ' WHERE gid IN ('+gids.join(',')+');';
				sql += tableSql;
			}
			//console.log(sql)
			var client = conn.getPgDataDb();
			client.query(sql, function(err, results) {
				if (err)
					return callback(err);
				asyncCallback(null,gids);
			})

		}],
		addToTable: ['removeFromTable',function(asyncCallback,results) {
			if (method=='delete') {
				return asyncCallback(null);
			}
			var gids = results.removeFromTable;
			var isPoint = geom.indexOf('POINT')>-1;
			var sql = '';
			var conf = results.dbRecord;
			var maxGid = conf.maxGid;
			id = id ? parseInt(id) : new Date().getTime();
			var addedGids = [];
			if (isPoint) {
				for (var i=0;i<5;i++) {

					if (gids) {
						var gid = gids[i];
					}
					else {
						maxGid++;
						var gid = maxGid;
					}
					addedGids.push(gid);
					var rowSql = 'INSERT INTO up.base_user_'+userId+'_loc_'+loc+' VALUES ('+gid;
					var fromMeters = (i*1000);
					var toMeters = (i+1)*1000;
					rowSql += ",'Point "+gid+" "+i+'-'+(i+1)+"km'";
					var geomSql = "ST_Transform(ST_GeomFromText('#geom#',900913),4326)";
					geomSql = geomSql.replace(new RegExp('#geom#','g'),geom);
					var bufferSql = 'ST_Difference(ST_Buffer(#geom#::geography,'+toMeters+')::geometry,ST_Buffer(#geom#::geography,'+fromMeters+')::geometry)';
					bufferSql = bufferSql.replace(new RegExp('#geom#','g'),geomSql);
					rowSql += ','+bufferSql,
					rowSql += ',ST_Centroid(#geom#)';
					rowSql += ',ST_Area(#geom#::geography)';
					rowSql += ',ST_Length(#geom#::geography)';
					rowSql += ',ST_Box2D(#geom#)';
					rowSql += ','+id;
					rowSql += ','+i/2+');';
					rowSql = rowSql.replace(new RegExp('#geom#','g'),bufferSql);
					sql += rowSql;
				}
			}
			else {
				if (gids) {
					var gid = gids[0];
				}
				else {
					maxGid++;
					var gid = maxGid
				}
				addedGids.push(gid);
				var rowSql = 'INSERT INTO up.base_user_'+userId+'_loc_'+loc+' VALUES ('+gid;
				rowSql += ",'Polygon "+gid+"'";
				var geomSql = "ST_Transform(ST_GeomFromText('#geom#',900913),4326)";
				geomSql = geomSql.replace(new RegExp('#geom#','g'),geom);
				rowSql += ','+geomSql;
				rowSql += ',ST_Centroid(#geom#)';
				rowSql += ',ST_Area(#geom#::geography)';
				rowSql += ',ST_Length(#geom#::geography)';
				rowSql += ',ST_Box2D(#geom#)';
				rowSql += ','+id;
				rowSql += ',NULL);';
				rowSql = rowSql.replace(new RegExp('#geom#','g'),geomSql);
				sql += rowSql;
			}
			var client = conn.getPgDataDb();
			client.query(sql, function(err, results) {
				if (err) return callback(err);
				var result = {
					gids: addedGids,
					maxGid: maxGid,
					id: id
				};
				asyncCallback(null, result);
			})

		}],
		updateRecord: ['addToTable',function(asyncCallback,results) {
			var conf = results.dbRecord;
			var obj = results.addToTable;
			if (obj) {
				conf.geometries[obj.id] = {geom: geom, gids: obj.gids};
				conf.maxGid = obj.maxGid;
			}
			if (method!='create') {
				delete conf.analysisMap[id];
			}
			if (method=='delete') {
				delete conf.geometries[id];
			}

			crud.update('userpolygon',conf,{userId: userId},function(err,resl) {
				if (err) return callback(err);
				res.data = obj ? obj.id : null;
				return callback(null);
			})
		}]
	};
	async.auto(opts);
}


function checkAnalysis(params,req,res,callback) {
	var userId = req.userId;
	if (!userId) {
		return callback('notloggedin');
	}
	var location = parseInt(params['location']);
	var years = JSON.parse(params['years']);
	var analysis = JSON.parse(params['analysis']);
	var confToCheck = [];
	//var client = conn.getPgDataDb(); /// JJJJJ nepouzito?
	for (var i=0;i<years.length;i++) {
		for (var j=0;j<analysis.length;j++){
			var year = years[i];
			var oneAnalysis = analysis[j];
			confToCheck.push({year:year,analysis:oneAnalysis});
		}
	}

	var opts = {
		dbRecord: function(asyncCallback) {
			crud.read('userpolygon',{$and:[{location:location},{user:userId}]},function(err,resls) {
				if (err) return callback(err);
				var conf = resls[0];
				if (!conf) {
					return callback(null);
				}
				return asyncCallback(null,conf)
			})
		},
		hasBase: function(asyncCallback) {
			var client = conn.getPgDataDb();
			var sql = 'SELECT COUNT(*) as cnt';
			sql += ' FROM up.base_user_'+userId+'_loc_'+location;
			//console.log(sql)
			client.query(sql, function(err, resls) {
				if (err) return callback(null);
				//console.log(resls);
				if (!resls.rows[0] || resls.rows[0].cnt<1) return callback(null);
				return asyncCallback(null);
			})
		},
		analysis: function(asyncCallback) {
			crud.read('analysis',{},function(err,resls) {
				if (err) return callback(err);
				var reslMap = {};
				for (var i=0;i<resls.length;i++) {
					var resl = resls[i];
					reslMap[resl._id] = resl;
				}
				return asyncCallback(null,reslMap);
			})
		},

		createTable: ['dbRecord','analysis','hasBase',function(asyncCallback,results) {
			var dbRecord = results.dbRecord;
			var analysisCreated = dbRecord.analysisCreated;
			var tablesToCreate = [];
			var sql = '';
			for (var i=0;i<confToCheck.length;i++) {
				var conf = confToCheck[i];
				if (analysisCreated[conf.analysis] && analysisCreated[conf.analysis][conf.year]) {
					continue;
				}
				analysisCreated[conf.analysis] = analysisCreated[conf.analysis] || {};
				analysisCreated[conf.analysis][conf.year] = true;
				var tableName = 'up.user_'+userId+'_loc_'+location+'_an_'+conf.analysis+'_y_'+conf.year;
				var analysisObj = results.analysis[conf.analysis];
				var attributeSet = analysisObj.attributeSet;
				var attributes = [];
				sql += 'CREATE TABLE '+tableName+' (gid integer';

				for (var j=0;j<analysisObj.attributeMap.length;j++) {
					var attrObj = analysisObj.attributeMap[j];
					var attrName = 'as_'+attributeSet+'_attr_'+attrObj.attribute;
					attributes.push(attrName);
					sql += ',' + attrName+' real';

				}
				sql += ');';
				tablesToCreate.push({name:tableName,attributes:attributes});
			}
			if (!sql) {
				return asyncCallback(null,tablesToCreate);
			}

			var client = conn.getPgDataDb();

			client.query(sql, function(err, resls) {
				if (err) return callback(err);
				asyncCallback(null, tablesToCreate);
			})
		}],
		createView: ['createTable',function(asyncCallback,results) {
			if (!results.createTable.length) {
				return asyncCallback(null);
			}
			var sql = '';
			var dbRecord = results.dbRecord;
			for (var i=0;i<years.length;i++) {
				var year = years[i];
				var viewName = 'views.layer_user_'+userId+'_loc_'+location+'_y_'+year;
				sql += 'DROP VIEW IF EXISTS '+viewName+';';
				sql += 'CREATE VIEW '+viewName+' AS (SELECT ';
				sql += 'a.gid,';
				sql += 'a.name,';
				sql += 'a.the_geom,';
				sql += 'a.centroid,';
				sql += 'a.area,';
				sql += 'a.length,';
				sql += 'a.extent,';
				sql += 'a.fromdistance';
				var joins = '';
				for (var an in dbRecord.analysisCreated) {
					if (dbRecord.analysisCreated[an][year]) {
						var analysisObj = results.analysis[an];
						var attrSet = analysisObj.attributeSet;
						var alias = 'an_'+an;
						joins += ' LEFT JOIN up.user_'+userId+'_loc_'+location+'_an_'+an+'_y_'+year+' '+alias+' ON a.gid='+alias+'.gid';
						for (var j=0;j<analysisObj.attributeMap.length;j++) {
							var attrObj = analysisObj.attributeMap[j];
							var attrName = 'as_'+attrSet+'_attr_'+attrObj.attribute;
							sql += ','+alias+'.'+attrName;
						}
					}
				}

				sql += ' FROM up.base_user_'+userId+'_loc_'+location+' a';
				sql += joins;
				sql +=');';
			}
			var client = conn.getPgDataDb();
			client.query(sql, function(err, resls) {
				if (err) return callback(err);
				asyncCallback(null);
			})

		}],
		geoserverLayers: ['createView',function(asyncCallback,results) {
			if (!results.createTable.length) {
				return asyncCallback(null);
			}
			var dbRecord = results.dbRecord;
			var createdYears = dbRecord.viewsCreated;
			async.forEach(years,function(year,eachCallback) {
				var method = 'PUT';

				if (createdYears.indexOf(year)<0) {
					method = 'POST';
					createdYears.push(year);
				}
				var viewName = 'user_'+userId+'_loc_'+location+'_y_'+year;
				geoserverLayers.changeLayerGeoserver(viewName,method,function(err) {
					if (err) return callback(err);
					return eachCallback(null);
				})
			}, asyncCallback);
		}],
		performAnalysis: ['geoserverLayers',function(asyncCallback,results) {
			var dbRecord = results.dbRecord;
			var analysisMap = results.analysis;
			var analysisToPerform = [];
			dbRecord.analysisMap = dbRecord.analysisMap || {};
			for (var i=0;i<analysis.length;i++) {
				var oneAnalysis = analysis[i];
				var map = dbRecord.analysisMap[oneAnalysis] || {};
				//console.log(map);
				dbRecord.analysisMap[oneAnalysis] = map;
				for (var j=0;j<years.length;j++) {
					var year = years[j];
					var yearMap = map[year] || {};
					map[year] = yearMap;
					var gids = [];
					var ids = [];
					for (var id in dbRecord.geometries) {
						if (yearMap[id]) continue;
						ids.push(id);
						//yearMap[id] = true;
						gids = us.union(gids,dbRecord.geometries[id].gids);
					}
					if (gids.length) {
						analysisToPerform.push({analysis:oneAnalysis,year:year,gids:gids,yearMap: yearMap,ids:ids});
					}
				}
			}
			//console.log(analysisToPerform)
			if (!analysisToPerform.length) {
				return asyncCallback(null);
			}
			async.forEach(analysisToPerform,function(item,eachCallback) {

				var anObj = analysisMap[item.analysis];
				var ghostObj = {
					location: location,
					year: item.year,
					ghost: true,
					featureLayerTemplates: [-1],
					gids: item.gids,
					sourceTable: 'views.layer_user_'+userId+'_loc_'+location+'_y_'+item.year,
					targetTable: 'up.user_'+userId+'_loc_'+location+'_an_'+item.analysis+'_y_'+item.year
				};
				spatialAgg.check(anObj,ghostObj,function(err,layerRefMap) {
					if (err) {
						console.log(err.stack);
						return asyncCallback(null);
					}
					spatialAgg.perform(anObj,ghostObj,layerRefMap,{},function(err) {
						//console.log('performing');
						if (err) return callback(err);
						for (var i=0;i<item.ids.length;i++) {
							item.yearMap[item.ids[i]] = true;
						}

						return eachCallback(null);
					})
				})
			},asyncCallback)
		}],
		updateDbRecord: ['performAnalysis',function(asyncCallback,results) {
			crud.update('userpolygon',results.dbRecord,{userId:userId},function(err) {
				if (err) return callback(err);
				return callback(null);
			});
		}]

	};
	async.auto(opts);

}

var generateId = function() {
	var time = new Date().getTime();
	var random = Math.round(Math.random() * 100000);
	var id = time.toString(32) + random.toString(32);
	return id;
};

module.exports = {
	userPolygon: userPolygon,
	checkAnalysis: checkAnalysis
};