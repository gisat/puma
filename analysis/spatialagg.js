var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var pg = require('pg');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

function check(analysisObj, performedAnalysisObj, callback) {

	var location = performedAnalysisObj.location;
	var year = performedAnalysisObj.year;
	var featureLayerTemplates = performedAnalysisObj.featureLayerTemplates.slice(0);
	featureLayerTemplates.push(analysisObj.areaTemplate);
	var attrSets = [];
	if (analysisObj.groupAttributeSet) {
		attrSets.push(analysisObj.groupAttributeSet);
	}
	for (var i = 0; i < analysisObj.attributeMap.length; i++) {
		var attrRec = analysisObj.attributeMap[i];
		if (attrRec.normAttributeSet) {
			attrSets.push(attrRec.normAttributeSet);
		}
		if (attrRec.calcAttributeSet) {
			attrSets.push(attrRec.calcAttributeSet);
		}
	}


	var layerRefMap = {};

	async.auto({
		'layerRefFl': function(asyncCallback) {
			async.map(featureLayerTemplates, function(featureLayerTemplate, mapCallback) {
				// user polygon
				if (featureLayerTemplate==-1) {
					return mapCallback(null,null);
				}
				var filter =  {areaTemplate: featureLayerTemplate, location: location, year: year, isData: false};
				crud.read('layerref',filter, function(err, resls) {
					if (err) {
						logger.error("It wasn't possible to read layerref with filter: ", filter);
						return callback(err);
					}
					if (!resls.length) {
						logger.error("LAYERREF missing 1||||| areaTemplate: ",featureLayerTemplate," | location: ",location," | year: ",year, " Filter: ", filter);
						return callback(new Error('There is no base reference layer for combination of year ('+year+'), location ('+location+') and Vector Layer Template ('+featureLayerTemplate+'). Please try to take a look whether you have correctly associated Vector Layer Template with this number to the vector data layer from which the attributes for analysis comes. '));
					}
					return mapCallback(null, resls[0]);
				});
			}, function(err, results) {
				var layerRefMap = {};
				for (var i = 0; i < featureLayerTemplates.length; i++) {
					layerRefMap[featureLayerTemplates[i]] = results[i];
				}
				return asyncCallback(null, layerRefMap);
			});
		},
		'layerRefAs': ['layerRefFl', function(asyncCallback, results) {
			async.map(attrSets, function(attrSet, mapCallback) {
				var filter = {areaTemplate: analysisObj.areaTemplate, location: location, year: year, attributeSet: attrSet};
				crud.read('layerref', filter, function(err, resls) {
					if (err) {
						logger.error("It wasn't possible to read layerref with filter: ", filter, " Error: ", err);
						return callback(err);
					}
					if (!resls.length) {
						logger.error("LAYERREF missing 2||||| areaTemplate: ",analysisObj.areaTemplate," | location: ",location," | year: ",year, " Filter: ", filter);
						return callback(new Error('There is no reference layer for combination of year ('+year+'), location ('+location+'), Vector Layer Template ('+featureLayerTemplate+') and Attribute Set ('+attrSet+')'));
					}
					return mapCallback(null, resls[0]);
				});
			}, function(err, resls) {
				return callback(null, results.layerRefFl);
			});
		}]
	});
}

function perform(analysisObj, performedAnalysisObj, layerRefMap, req, callback) {
	//console.log(analysisObj,performedAnalysisObj)
	var refId = layerRefMap[analysisObj.areaTemplate]['_id'];
	var client = new pg.Client(config.pgDataConnString);
	client.connect();

	async.auto({
		geomType: function(asyncCallback) {
			var sql = 'SELECT DISTINCT ST_Dimension(the_geom) as dm,ST_SRID(the_geom) as srid FROM views.layer_' + refId+' LIMIT 1';
			client.query(sql, function(err, results) {
				if (err){
					logger.error("Unexpected PG Error! Performing Spatial aggregation. SQL: ", sql, " Error: ",err);
					return callback(err);
				}
				asyncCallback(null, results.rows[0]);
			});
		},
		perform: ['geomType', function(asyncCallback, results) {
			var location = performedAnalysisObj.location;
			var year = performedAnalysisObj.year;

			var columnMap = [];
			var addedAttrs = [];

			var select = 'SELECT a.gid';
			var outerSql = 'SELECT r.gid';
			var groupAttr = analysisObj.groupAttributeSet ? 'as_' + analysisObj.groupAttributeSet + '_attr_' + analysisObj.groupAttribute : null;

			select += groupAttr ? ',b.' + groupAttr : '';

			for (var i = 0; i < analysisObj.attributeMap.length; i++) {
				var obj = analysisObj.attributeMap[i];
				var text = null;
				if (groupAttr && obj.groupVal) {

					var attrName = 'as_' + analysisObj.attributeSet + '_attr_' + obj.attribute;
					var groupVals = obj.groupVal.split(',');
					var valText = '';
					for (var j=0;j<groupVals.length;j++) {
						valText += valText ? ' OR ' : '';
						valText += "r.&GROUPATTR&::varchar = '"+groupVals[j]+"'";
					}
					var outerText = "SUM(CASE WHEN "+valText+" THEN r.&INNERATTR& ELSE 0 END) AS &OUTERATTR&";
					outerText = outerText.replace(new RegExp('&GROUPATTR&', 'g'), groupAttr);
					outerText = outerText.replace(new RegExp('&OUTERATTR&', 'g'), attrName);
					var corrAttr = null;
					for (var j = 0; j < addedAttrs.length; j++) {
						var addedAttr = addedAttrs[j];
						if (addedAttr.type == obj.type && addedAttr.calcAttributeSet == obj.calcAttributeSet && addedAttr.calcAttribute == obj.calcAttribute
								&& addedAttr.normAttributeSet == obj.normAttributeSet && addedAttr.normAttribute == obj.normAttribute) {
							corrAttr = addedAttr;
							break;
						}
					}
					if (corrAttr) {
						outerText = outerText.replace(new RegExp('&INNERATTR&', 'g'), 'as_' + analysisObj.attributeSet + '_attr_' + corrAttr.attribute);
					}
					else {
						outerText = outerText.replace(new RegExp('&INNERATTR&', 'g'), attrName);
					}
					outerSql += ',' + outerText;
					if (corrAttr) {
						columnMap.push({
							column: attrName,
							attribute: obj.attribute
						});
						continue;
					}
				}
				switch (obj.type) {
					case 'count':
						text = 'COUNT(*)';
						break;
					case 'sumarea':
						text = 'SUM(&AREA&)';
						break;
					case 'avgarea':
						text = 'AVG(&AREA&)';
						break;
					case 'sumattr':
						text = results.geomType.dm > 0 ? 'SUM(&ATTR& * &AREA& / &AREA2&)' : 'SUM(&ATTR&)';
						break;
					case 'avgattrarea':
						text = results.geomType.dm > 0 ? 'SUM(&ATTR& * &AREA&) / SUM(&AREA&)' : 'AVG(&ATTR&)';
						break;
					case 'avgattrattr':
						text = results.geomType.dm > 0 ? 'SUM(&ATTR& * &ATTR2& * &AREA& / &AREA2&) / SUM(&ATTR2& * &AREA& / &AREA2&)' : 'SUM(&ATTR& * &ATTR2&) / SUM(&ATTR2&)';
						break;
				}
				var stText = results.geomType.dm > 1 ? 'ST_Area' : 'ST_Length';
				text = text.replace(new RegExp('&AREA&', 'g'), stText + '(ST_Intersection(ST_Transform(a.the_geom,4326),ST_Transform(b.the_geom,4326))::geography)');
				//text = text.replace(new RegExp('&AREA&', 'g'), stText + '(ST_Intersection(ST_Transform(a.the_geom,4326),ST_Transform(b.the_geom,4326))::geography)');

				text = text.replace(new RegExp('&AREA2&', 'g'), results.geomType.dm > 1 ? 'b.area' : 'b.length');
				text = text.replace(new RegExp('&ATTR&', 'g'), 'b.as_' + obj.calcAttributeSet + '_attr_' + obj.calcAttribute);
				text = text.replace(new RegExp('&ATTR2&', 'g'), 'b.as_' + obj.normAttributeSet + '_attr_' + obj.normAttribute);
				var attrName = 'as_' + analysisObj.attributeSet + '_attr_' + obj.attribute;
				text += ' AS ' + attrName;
				select += ',' + text;
				columnMap.push({
					column: attrName,
					attribute: obj.attribute
				});
				addedAttrs.push(obj);
			}

			select += ' FROM $LAYERREF$ a';
			select += ' JOIN views.layer_' + refId + ' b';
			select += ' ON ST_Intersects(b.the_geom,ST_Transform(a.the_geom,'+results.geomType.srid+'))';
			select += performedAnalysisObj.gids ? (' WHERE a.gid IN ('+performedAnalysisObj.gids.join(',')+')') : '';
			select += ' GROUP BY a.gid';
			select += groupAttr ? ',b.' + groupAttr : '';

			var tableName = performedAnalysisObj.targetTable || ('analysis.an_' + performedAnalysisObj['_id'] + '_$INDEX$');

			var sql = performedAnalysisObj.gids ? ('INSERT INTO '+tableName+' ') : ('CREATE TABLE '+tableName+ ' AS (');
			if (groupAttr) {
				sql += outerSql;
				sql += ' FROM (';
				sql += select;
				sql += ') AS r';
				sql += ' GROUP BY r.gid';
			}
			else {
				sql += select;
			}

			sql += performedAnalysisObj.gids ? '' : ')';


			async.forEachSeries(performedAnalysisObj.featureLayerTemplates, function(item, asyncCallback) {
				var layerRef = item != -1 ? layerRefMap[item]['_id'] : null;
				var layerName = item != -1 ? 'views.layer_'+layerRef : performedAnalysisObj.sourceTable;
				var currentSql = sql.replace('$INDEX$', item);
				currentSql = currentSql.replace('$LAYERREF$', layerName);
				logger.trace("spatialagg#perform Sql to perform: ", currentSql);
				client.query(currentSql, function(err, results) {
					if (err) {
						logger.error("spatialagg#perform Unexpected PG Error! Performing Spatial aggregation. SQL: ", currentSql, " Error: ",err);
						return asyncCallback({message: "SQL query error (" + err + ")"});
					}
					if (performedAnalysisObj.ghost){
						return asyncCallback(null);
					}
					var filter = {
						location: location,
						year: year,
						areaTemplate: item,
						isData: true,
						fidColumn: 'gid',
						attributeSet: analysisObj.attributeSet,
						columnMap: columnMap,
						layer: 'analysis:an_' + performedAnalysisObj['_id'] + '_' + item,
						analysis: performedAnalysisObj['_id']
					};
					crud.create('layerref', filter, function(err, res) {
						if(err) {
							logger.error("spatialagg#perform Creation of layerref failed. Filter: ", filter,"Error: ", err);
							return asyncCallback({message: "MongoDB creating 'layerref' ("+err+")"});
						}
						return asyncCallback(null, res['_id']);
					});
				});
			}, function(err, resls) {
				client.end();
				if (performedAnalysisObj.ghost) {
					//return callback(null);
					logger.warn("Performed analysis is a ghost: ", performedAnalysisObj);
				}
				if(!performedAnalysisObj.status){
					if(err){
						logger.error("Analysis: ", performedAnalysisObj, " Failed with error: ", err);
						performedAnalysisObj.status = "Failed. "+err;
					}else{
						performedAnalysisObj.status = "Successful";
					}
				}
				performedAnalysisObj.finished = new Date();
				crud.update('performedanalysis', performedAnalysisObj, {userId: req.userId,isAdmin: true}, function(err) {
					if(err){
						logger.error("Failed to write in MongoDB performedanalysis. Error:", err);
						return callback(err);
					}
					return callback(null);
				});
			});
		}]
	});
}

module.exports = {
	check: check,
	perform: perform
};