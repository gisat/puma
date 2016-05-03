var analysis = {
	spatialagg: require('../analysis/spatialagg'),
	fidagg: require('../analysis/fidagg'),
	math: require('../analysis/math')
};
var async = require('async');
var conn = require('../common/conn');
var crud = require('../rest/crud');
var pg = require('pg');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;




function remove(params,req,res,callback) {

	var opts = {
		layerRefs: function(asyncCallback) {
			var filter = {analysis:params.data['_id']};
			crud.read('layerref',filter,function(err,resls) {
				if (err) {
					logger.error("It wasn't possible to read layerref with Filter: ", filter);
					return callback(err);
				}
				return asyncCallback(null,resls);
			});
		},
		layers: ['layerRefs',function(asyncCallback,results) {
			async.map(results.layerRefs,function(item,mapCallback) {
				var layerName = item.layer;
				var filter = {_id:item['_id']}
				crud.remove('layerref', filter,{},function(err,resls) {
					if (err) {
						logger.error("It wasn't possible to read layerref with filter: ", filter);
						return callback(err);
					}
					return mapCallback(null,layerName);
				});
			}, function(err,resls) {
				asyncCallback(null,resls);
			})
		}],
		deleteLayers: ['layers',function(asyncCallback,results) {
			var client = new pg.Client(config.pgDataConnString);
			client.connect();
			var sql = '';
			var layerNames = [];
			for (var i=0;i<results.layers.length;i++) {
				var layer = results.layers[i];
				if (layerNames.indexOf(layer)>-1) {
					continue;
				}
				var tableName = layer.replace(':','.');
				layerNames.push(layer);
				sql += 'DROP TABLE '+tableName+';'
			}
			client.query(sql,function(err) {
				if (err) {
					logger.error("It wasn't possible to delete layers. Sql: ", sql, " Error: ", err);
					return callback(err);
				}
				client.end();
				asyncCallback(null)
			});
		}],

		deleteAnalysis: ['deleteLayers',function(asyncCallback) {
			crud.remove('performedanalysis',params.data,{},function(err,result) {
				if (err) {
					logger.error("It wasn't possible to remove performed analysis: ", params.data, " Error:", err);
					return callback(err);
				}
				return callback(null);
			});
		}]

	};



	async.auto(opts);

}


function create(params,req,res,callback) {
	var performedAnalysisObj = params['data'];
	var opts = {
		'analysis': function(asyncCallback) {
			var filter = {_id:performedAnalysisObj.analysis};
			crud.read('analysis', filter, function(err,resls) {
				if (err) {
					logger.error("It wasn't possible to read analysis with filter: ", filter, " Error: ", err);
					return callback(err);
				}
				return asyncCallback(null,resls[0]);
			})
		},
		layerRef: ['analysis',function(asyncCallback,results) {
			var analysisObj = results.analysis;


			var type = analysisObj.type;
			analysis[type].check(analysisObj,performedAnalysisObj,function(err,resls) {
				//console.log(resls)
				if (err) {
					logger.error("Check for analysis of type: ", type, " Failed. Analysis: ", analysisObj,
						" Parameters to perform analysis: ", performedAnalysisObj, " Error: ", err);
					return callback(err);
				}
				return asyncCallback(null,resls)
			})
		}],
		create: ['layerRef','analysis',function(asyncCallback,results) {
			crud.create('performedanalysis',performedAnalysisObj,function(err,result) {

				var analysisObj = results.analysis;
				var type = analysisObj.type;
				res.data = result;

				callback(null);
				analysis[type].perform(analysisObj,result,results.layerRef,req,function(err) {
					if (err) {
						logger.error('Analysis ', analysisObj, ' failed. Error: ', err);
					}
					else {
						logger.info('Analysis ',analysisObj,' finished');
					}

				});


			})
		}]
	};
	async.auto(opts)
}


module.exports = {
	create: create,
	remove: remove
};