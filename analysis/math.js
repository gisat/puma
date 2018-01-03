var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var pg = require('pg');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

function check(analysisObj, performedAnalysisObj, callback) {

	var location = performedAnalysisObj.location;
	var year = performedAnalysisObj.year;
	var featureLayerTemplates = performedAnalysisObj.featureLayerTemplates;

	var attrSets = analysisObj.attributeSets;

	var layerRefMap = {};


	var opts = {
		'layerRefFl': [function(asyncCallback, results) {
				async.map(featureLayerTemplates, function(flTemplate, mapCallback) {
					var filter =  {areaTemplate: flTemplate, location: location, year: year, isData: false};
					crud.read('layerref', filter, function(err, resls) {
						if (err) {
							logger.error("It wasn't possible to read layerref with filter: ", filter, " Error: " ,err);
							return callback(err);
						}
						if (!resls.length) {
							logger.error("Layerref is missing for filter: ", filter);
							return callback(new Error('There is no base reference layer for combination of year ('+year+'), location ('+location+') and Vector Layer Template ('+flTemplate+') Please try to take a look whether you have correctly associated Vector Layer Template with this number to the vector data layer from which the attributes for analysis comes. '));
						}
						return mapCallback(null, resls[0]);
					});
				}, function(err, resls) {
					var layerRefMap = {};
					for (var i = 0; i < featureLayerTemplates.length; i++) {
						layerRefMap[featureLayerTemplates[i]] = resls[i];
					}
					return asyncCallback(null, layerRefMap);
				});
			}],
		'layerRefAs': ['layerRefFl', function(asyncCallback, results) {
				async.map(featureLayerTemplates, function(featureLayerTemplate, mapCallback) {
					var filter = {areaTemplate: featureLayerTemplate, location: location, year: year, isData: true, attributeSet: {$in: attrSets}};
					crud.read('layerref', filter, function(err, resls) {
						if (err) {
							logger.error("It wasn't possible to read layerref with filter: ", filter, " Error: ", err);
							return callback(err);
						}
						var map = {};
						for (var i = 0; i<resls.length; i++) {
							var resl = resls[i];
							map[resl.attributeSet] = resl;
						}
						for (var i = 0; i < attrSets.length; i++) {
							var attrSet = attrSets[i];
							if (!map[attrSet]) {
								logger.error("LayerRef is missing AreaTemplate: ", featureLayerTemplate, " Location: ",
									location, "Year: ", year, " Analysis: ", analysisObj, " Attribute set: ", attrSet);
								return callback(new Error('There is no reference layer for combination of year ('+year+'), location ('+location+'), Vector Layer Template ('+featureLayerTemplate+') and Attribute Set ('+attrSets+')'))
							} else {
								logger.trace("ok\n");
							}
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
	var featureLayerTemplates = performedAnalysisObj.featureLayerTemplates;

	var attrSets = analysisObj.attributeSets;
	
	async.auto({
		'attributes': function(asyncCallback) {
			crud.read('attributeset', {_id: attrSets[0]}, function(err, resls) {
				if (err){
					logger.error("It wasn't possible to read attribute set: ", attrSets[0], " Error: ", err);
					return callback(err);
				}
				return asyncCallback(null, resls[0].attributes);
			});
		},
		perform: ['attributes', function(asyncCallback, results) {

			var columnMap = [];


			var sign = analysisObj.useSum ? '+' : '-';
			var select = 'SELECT gid,';
			for (var i = 0; i < results.attributes.length; i++) {
				var attr = results.attributes[i];
				sign = analysisObj.useSum ? '+' : '-';
				select += i != 0 ? ',' : '';
				for (var j = 0; j < attrSets.length; j++) {
					select += j != 0 ? sign : '';
					var as = attrSets[j];
					select += ' as_' + as + '_attr_' + attr;
				}
				var resColumn = 'as_' + analysisObj.attributeSet + '_attr_' + attr;
				select += ' AS ' + resColumn;
				columnMap.push({
					column: resColumn,
					attribute: attr
				});
			}


			select += ' FROM views.layer_$LAYERREF$';

			var sql = 'CREATE TABLE analysis.an_' + performedAnalysisObj['_id'] + '_$INDEX$ AS (';
			sql += select;
			sql += ')';

			async.forEachSeries(featureLayerTemplates, function(item, eachCallback) {
				var layerRef = layerRefMap[item]['_id'];
				var currentSql = sql.replace('$LAYERREF$', layerRef);
				currentSql = currentSql.replace('$INDEX$', item);
				//console.log("analysis/math.js currentSql: " + currentSql);
				client.query(currentSql, function(err, resls) {
					if (err) {
						logger.error("It wasn't possible to run SQL query ", currentSql, " Error: ", err);
						return asyncCallback({message: "SQL query error (" + err + ")"});
					}

					var data = {
						location: location,
						year: year,
						areaTemplate: item,
						isData: true,
						fidColumn: 'gid',
						attributeSet: analysisObj.attributeSet,
						columnMap: columnMap,
						layer: 'analysis:an_' + performedAnalysisObj['_id']+'_'+item,
						analysis: performedAnalysisObj['_id']
					};
					crud.create('layerref', data, function(err) {
						if(err) {
							logger.error("It wasn't possible to create layerref: ", data, " Error: ", err);
							return asyncCallback({message: "MongoDB creating 'layerref' ("+err+")"});
						}
						return eachCallback(null);
					});
				});
			}, function(err, resls) {
				client.end();
				if (performedAnalysisObj.ghost) {
					//return callback(null);
					logger.warn("Performed analysis is ghost: ", performedAnalysisObj);
				}
				if(!performedAnalysisObj.status){
					if(err){
						logger.error("The analysis: ", performedAnalysisObj, " Failed", " With Error: ", err);
						performedAnalysisObj.status = "Failed. "+err;
					}else{
						performedAnalysisObj.status = "Successful";
					}
				}
				performedAnalysisObj.finished = new Date();
				crud.update('performedanalysis', performedAnalysisObj, {userId: req.session.userId, isAdmin: true}, function(err) {
					if(err){
						logger.error("Failed to write in MongoDB performedanalysis:", performedAnalysisObj, " Error", err);
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


