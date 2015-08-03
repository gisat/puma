var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var pg = require('pg');

function check(analysisObj, performedAnalysisObj, callback) {

    var location = performedAnalysisObj.location;
    var year = performedAnalysisObj.year;
    var featureLayerTemplates = performedAnalysisObj.featureLayerTemplates;

    var attrSets = analysisObj.attributeSets;

    var layerRefMap = {};


    var opts = {
        'layerRefFl': [function(asyncCallback, results) {
                async.map(featureLayerTemplates, function(flTemplate, mapCallback) {
                    crud.read('layerref', {areaTemplate: flTemplate, location: location, year: year, isData: false}, function(err, resls) {
                        if (err)
                            return callback(err);
                        if (!resls.length) {
							console.log("LAYERREF missing 1||||| areaTemplate: "+flTemplate+" | location: "+location+" | year: "+year);
                            return callback(new Error('missinglayerref'));
                        }
                        return mapCallback(null, resls[0]);
                    });
                }, function(err, resls) {
                    var layerRefMap = {};
                    for (var i = 0; i < featureLayerTemplates.length; i++) {
                        layerRefMap[featureLayerTemplates[i]] = resls[i];
                    }
                    return asyncCallback(null, layerRefMap);
                })
            }],
        'layerRefAs': ['layerRefFl', function(asyncCallback, results) {
                async.map(featureLayerTemplates, function(featureLayerTemplate, mapCallback) {
                    crud.read('layerref', {areaTemplate: featureLayerTemplate, location: location, year: year, isData: true, attributeSet: {$in: attrSets}}, function(err, resls) {
                        if (err)
                            return callback(err);
                        var map = {};
                        for (var i = 0; i<resls.length; i++) {
                            var resl = resls[i];
                            map[resl.attributeSet] = resl;
                        }
                        for (var i = 0; i < attrSets.length; i++) {
                            var attrSet = attrSets[i];
                            if (!map[attrSet]) {
								console.log("LAYERREF missing 2||||| areaTemplate: "+featureLayerTemplate+" | location: "+location+" | year: "+year+" | analysisObj.attributeSets: "+analysisObj.attributeSets+" | attrSet: "+attrSet);
                                return callback(new Error('missinglayerref'))
                            } else console.log("ok\n");
                        }
                        return mapCallback(null, resls[0]);
                    });
                }, function(err, resls) {
                    return callback(null, results.layerRefFl);
                })
            }]
    }

    async.auto(opts);


}

function perform(analysisObj, performedAnalysisObj, layerRefMap, req, callback) {
    //console.log(analysisObj,performedAnalysisObj)
    var client = new pg.Client(conn.getPgDataConnString());
    client.connect();


    var location = performedAnalysisObj.location;
    var year = performedAnalysisObj.year;
    var featureLayerTemplates = performedAnalysisObj.featureLayerTemplates;

    var attrSets = analysisObj.attributeSets;
	
    async.auto({
        'attributes': function(asyncCallback) {
            crud.read('attributeset', {_id: attrSets[0]}, function(err, resls) {
                if (err){
					console.log("Unexpected PG Error!");
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
				var sign = analysisObj.useSum ? '+' : '-';
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
				console.log("analysis/math.js currentSql: " + currentSql);
				client.query(currentSql, function(err, resls) {
					if (err)
						return asyncCallback("SQL query error ("+err+")");
					console.log("analysis/math.js currentSql: a");
					crud.create('layerref', {
						location: location,
						year: year,
						areaTemplate: item,
						isData: true,
						fidColumn: 'gid',
						attributeSet: analysisObj.attributeSet,
						columnMap: columnMap,
						layer: 'analysis:an_' + performedAnalysisObj['_id']+'_'+item,
						analysis: performedAnalysisObj['_id']
					}, function(err) {
						if(err) {
							return asyncCallback("MongoDB creating 'layerref' ("+err+")");
						}
						return eachCallback(null);
					});
                });
			}, function(err, resls) {
				client.end();
				//if (performedAnalysisObj.ghost) {
					//return callback(null);
					console.log("\n\n    .-.\n   (o o) bubu, "+(performedAnalysisObj.ghost ? "true":"false")+"!\n   | O \\ \n    \\   \\ \n     `~~~' \n   Duch Cát\n\n");
				//}
				if(!performedAnalysisObj.status){
					if(err){
						performedAnalysisObj.status = "Failed. "+err;
					}else{
						performedAnalysisObj.status = "Successful";
					}
				}
				performedAnalysisObj.finished = new Date();
				crud.update('performedanalysis', performedAnalysisObj, {userId: req.userId,isAdmin: true}, function(err) {
					if(err){
						console.log("Failed to write in MongoDB performedanalysis. Error message:\n"+err);
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
}


