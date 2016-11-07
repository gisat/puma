var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var pg = require('pg');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

function check(analysisObj, performedAnalysisObj, callback) {

	var location = performedAnalysisObj.location;
	var year = performedAnalysisObj.year;
	var featureLayerTemplate = performedAnalysisObj.featureLayerTemplates[0];
	var attrSets = getAttrSets(analysisObj);

	var layerRefMap = {};

	var opts = {
		'dataset': function(asyncCallback) {

			crud.read('dataset', {_id: performedAnalysisObj.dataset}, function(err, resls) {
				if (err) {
					logger.error("It wasn't possible to read dataset: ", performedAnalysisObj.dataset, " Error: ", err);
					return callback(err);
				}
				return asyncCallback(null, resls[0])
			});
		},
		'layerRefFl': ['dataset',function(asyncCallback, results) {
			var flTemplates = results.dataset.featureLayers;
			var flIndex = flTemplates.indexOf(featureLayerTemplate);
			flTemplates = flTemplates.slice(0, flIndex + 1);
			async.map(flTemplates, function(flTemplate, mapCallback) {
				var filter = {areaTemplate: flTemplate, location: location, year: year, isData: false};
				crud.read('layerref', filter, function(err, resls) {
					if (err) {
						logger.error("It wasn't possible to read layerref with filter: ", filter, " Error: ", err);
						return callback(err);
					}
					if (!resls.length) {
						logger.error("Base layer ref is missing. Filter: ", filter);
					    return callback(new Error('There is no base reference layer for combination of year ('+year+'), location ('+location+') and Vector Layer Template ('+flTemplate+') Please try to take a look whether you have correctly associated Vector Layer Template with this number to the vector data layer from which the attributes for analysis comes. '))
					}
					if (flTemplates.indexOf(flTemplate)!=0 && !resls[0].parentColumn) {
						logger.error("Parent of base layer ref is missing. Filter: ", filter);
						return callback(new Error('missingparent'))
					}
					return mapCallback(null, resls[0]);
				});
			}, function(err, results) {
				var layerRefMap = {};
				for (var i = 0; i < flTemplates.length; i++) {
					layerRefMap[flTemplates[i]] = results[i];
				}
				return asyncCallback(null, layerRefMap);
			});
		}],
		'layerRefAs': ['layerRefFl', function(asyncCallback, results) {
				async.map(attrSets, function(attrSet, mapCallback) {
					var filter = {areaTemplate: featureLayerTemplate, location: location, year: year, attributeSet: attrSet};
					crud.read('layerref', filter, function(err, resls) {
						if (err) {
							logger.error("It wasn't possible to read layerref with filter: ", filter, " Error: ", err);
							return callback(err);
						}
						if (!resls.length) {
							logger.error("There was no layerref with given filter: ", filter);
							return callback(new Error('There is no reference layer for combination of year ('+year+'), location ('+location+'), Vector Layer Template ('+featureLayerTemplate+') and Attribute Set ('+attrSet+')'))
						}
						return mapCallback(null, resls[0]);
					});
				}, function(err, resls) {
					return callback(null, results.layerRefFl);
				});
			}]
	};

	async.auto(opts);
}

function perform(analysisObj, performedAnalysisObj, layerRefMap, req, callback) {
	//console.log(analysisObj,performedAnalysisObj)
	var client = new pg.Client(config.pgDataConnString);
	client.connect();


	var location = performedAnalysisObj.location;
	var year = performedAnalysisObj.year;
	var featureLayerTemplate = performedAnalysisObj.featureLayerTemplates[0];

	async.auto({
		'dataset': function(asyncCallback) {
			crud.read('dataset', {_id: performedAnalysisObj.dataset}, function(err, resls) {
				if (err){
					logger.error("It wasn't possible to read dataset with id: ", performedAnalysisObj.dataset, " Error: ", err);
					return callback(err);
				}
				return asyncCallback(null, resls[0]);
			});
		},
		perform: ['dataset', function(asyncCallback, results) {
			var flTemplates = results.dataset.featureLayers;
			var flIndex = flTemplates.indexOf(featureLayerTemplate);
			flTemplates = flTemplates.slice(0, flIndex+1);
			var columnMap = {};
			var addedAttrs = [];

			var select = 'SELECT a.parentgid as gid';

			for (var i = 0; i < analysisObj.attributeMap.length; i++) {
				var obj = analysisObj.attributeMap[i];
				var text = '';

				switch (obj.type) {
					case 'sum':
						text = 'SUM(&ATTR&)';
						break;
					case 'avgarea':
						text = 'SUM(&ATTR& * &AREA&) / SUM(&AREA&)';
						break;
					case 'avgattr':
						text = 'SUM(&ATTR& * &ATTR2&) / SUM(&ATTR2&)';
						break;
				}
				var attrName = 'as_' + obj.attributeSet + '_attr_' + obj.attribute;
				text = text.replace(new RegExp('&AREA&', 'g'), 'a.area');
				text = text.replace(new RegExp('&ATTR&', 'g'), 'a.' + attrName);
				text = text.replace(new RegExp('&ATTR2&', 'g'), 'a.as_' + obj.normAttributeSet + '_attr_' + obj.normAttribute);

				text += ' AS ' + attrName;
				select += ',' + text;
				columnMap[obj.attributeSet] = columnMap[obj.attributeSet] || [];
				columnMap[obj.attributeSet].push({
					column: attrName,
					attribute: obj.attribute
				});
				addedAttrs.push(obj);
			}

			select += ' FROM views.layer_$LAYERREF$ a GROUP BY a.parentgid';

			var sql = 'CREATE TABLE analysis.an_' + performedAnalysisObj['_id'] + '_$INDEX$ AS (';
			sql += select;
			sql += ')';
			flTemplates.reverse();
			var flTemplatesIterate = flTemplates.slice(0,flTemplates.length-1);
			async.forEachSeries(flTemplatesIterate, function(item, asyncCallback) {
				var layerRef = layerRefMap[item]['_id'];
				var i = flTemplatesIterate.indexOf(item);
				var nextFl = flTemplates[i+1];
				var currentSql = sql.replace('$INDEX$', nextFl);
				currentSql = currentSql.replace('$LAYERREF$', layerRef);
				client.query(currentSql, function(err, results) {
					if (err){
						return asyncCallback({message: "SQL query error ("+err+")"});
					}
					async.forEach(analysisObj.attributeSets, function(attrSet, eachCallback) {
						//console.log('AS '+attrSet);
						var data = {
							location: location,
							year: year,
							areaTemplate: nextFl,
							isData: true,
							fidColumn: 'gid',
							attributeSet: attrSet,
							columnMap: columnMap[attrSet].slice(0),
							layer: 'analysis:an_' + performedAnalysisObj['_id'] + '_' + nextFl,
							analysis: performedAnalysisObj['_id']
						};
						crud.create('layerref', data, function(err, res) {
							if(err) {
								logger.error("It wasn't possible to create layerref with Data: ", data, " Error: ", err);
								return asyncCallback({message: "MongoDB creating 'layerref' ("+err+")"});
							}
							return eachCallback(null);
						});
					}, function(err) {
						if (err) {
							logger.error("Problem with creating layerrefs based on the attribute sets: ",analysisObj.attributeSets ," Error: ", err);
							return asyncCallback(err); // zmena z callback
						}
						return asyncCallback(null);
					});
				});
			}, function(err, resls) {
				client.end();
				if (performedAnalysisObj.ghost) {
					//return callback(null);
					logger.warn("Performed analysis is ghost. Analysis: ", performedAnalysisObj);
				}
				if(!performedAnalysisObj.status){
					if(err){
						logger.error("The analysis was unsuccessful. Analysis: ", performedAnalysisObj);
						performedAnalysisObj.status = "Failed. "+err;
					}else{
						performedAnalysisObj.status = "Successful";
					}
				}
				performedAnalysisObj.finished = new Date();
				crud.update('performedanalysis', performedAnalysisObj, {userId: req.session.userId, isAdmin: true}, function(err) {
					if(err){
						logger.error("Failed to write in MongoDB performedanalysis. Data: ", performedAnalysisObj, " Error" , err);
						return callback(err);
					}
					return callback(null);
				});
			});
		}]
	});
}

var getAttrSets = function(analysisObj) {
	var attrSets = [];
	for (var i = 0; i < analysisObj.attributeMap.length; i++) {
		var attrRec = analysisObj.attributeMap[i];
		if (attrRec.normAttributeSet && attrSets.indexOf(attrRec.normAttributeSet)<0) {
			attrSets.push(attrRec.normAttributeSet);
		}
		if (attrRec.attributeSet && attrSets.indexOf(attrRec.attributeSet)<0) {
			attrSets.push(attrRec.attributeSet);
		}
	}
	return attrSets;
};
module.exports = {
	check: check,
	perform: perform
};
