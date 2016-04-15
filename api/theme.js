var async = require('async');
var _ = require('underscore');

var crud = require('../rest/crud');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;

function getLocationConf(params, req, res, callback) {
	async.auto({
		dataset: function(asyncCallback) {
			crud.read('dataset', {}, function(err, results) {
				if (err){
					return callback(err);
				}
				var datasetMap = {};
				for (var i=0;i<results.length;i++) {
					var result = results[i];
					datasetMap[result._id] = result;
				}

				asyncCallback(null, datasetMap);
			});
		},
		datasetMap: function(asyncCallback) {
			crud.read('location', {active: {$ne:false}}, function(err, results) {
				if (err){
					return callback(err);
				}
				var datasetMap = {};
				for (var i=0;i<results.length;i++) {
					var result = results[i];
					if (!result.dataset){
						continue;
					}
					datasetMap[result.dataset] = datasetMap[result.dataset] || [];
					datasetMap[result.dataset].push(result);
				}

				asyncCallback(null, datasetMap);
			});
		},
		singleLocationAreas: ['dataset','datasetMap',function(asyncCallback,results) {
			logger.info("theme# getLocationConf(), results.datasetMap:", results.datasetMap);

			var datasetMap = results.datasetMap;
			var resultArr = [];

			async.forEachOf(datasetMap, function datasetMapIterator(locationsOfDataset, datasetId, datasetMapIterationCallback) {

				var dataset = results.dataset[datasetId];
				async.each(locationsOfDataset, function(location, locationsIteratingCallback){
					//var location = locationsOfDataset[i];

					/**
					 * New approach: location has a BBOX, it is the same as location in Front Office
					 */
					if(location.hasOwnProperty("bbox") && location.bbox) {
						var loc = {
							name: location.name,
							locGid: null,
							id: location._id,
							dataset: datasetId,
							location: location._id,
							at: dataset.featureLayers[0],
							bbox: location.bbox
						};
						logger.info("theme# getLocationConf(), Adding normal location with bbox - ",loc.name);
						resultArr.push(loc);
						return locationsIteratingCallback(null);
					}
					/**
					 * Old approach: location has no BBOX, it's multilocation in AU layer - polygons are separate locations
					 */
					else{
						if(!dataset || !dataset.hasOwnProperty("featureLayers")){
							logger.trace("theme# getLocationConf(), empty dataset.featureLayers");
						}
						getLocationsFromDB({
							location: location._id,
							areaTemplate: dataset.featureLayers[0],
							isData: false,
							dataset: datasetId
						}, function getLocationsFromDBCallback(err, locations){
							if(err){
								return callback(err);
							}
							logger.info("theme# getLocationConf(), Adding multilocations of ", location.name);
							if(locations != null){
								resultArr = resultArr.concat(locations);
							}
							return locationsIteratingCallback(null)
						});
					}

				}, function locationsIteratingFinalCallback(err){
					datasetMapIterationCallback(err);
				}); // todo

			}, function datasetMapIterationFinalCallback(err){
				if (resultArr.length>1) {
					resultArr.push({
						name: 'All places',
						id: 'custom'
					});
				}
				res.data = resultArr;
				return callback();
			});
		}]
	});
}


function getLocationsFromDB(locationOptions, callback){
	var resultLocs = [];
	var client = conn.getPgDataDb();

	var datasetId = locationOptions.dataset;
	delete locationOptions.dataset;

	crud.read('layerref', locationOptions, function(err, layerRefs) {
		if (err){
			return callback(err);
		}
		if (!layerRefs.length){
			return callback(null);
		}
		var layerRef = layerRefs[0];
		var sql = 'SELECT gid,name FROM views.layer_' + layerRef._id;
		client.query(sql, {}, function(err, resls) {
			if (err){
				return callback(err);
			}
			for (var i = 0; i < resls.rows.length; i++) {
				var row = resls.rows[i];
				resultLocs.push({
					name: row.name,
					locGid: row.gid,
					id: locationOptions.location+'_'+row.gid,
					dataset: datasetId,
					location: locationOptions.location,
					at: locationOptions.areaTemplate,
					bbox: null
				});
			}
			callback(null, resultLocs);
		});
	});
}

function getThemeYearConf(params, req, res, callback) {
	if (!params['dataset'] || !params['years']) {
		res.data = [];
		return callback(null);
	}
	var years = JSON.parse(params['years']);
	var fids = params['fids'] ? JSON.parse(params['fids']) : null;
	var filter = params['filter'] ? JSON.parse(params['filter']) : null;
	async.auto({

		dataset: function(asyncCallback) {
			crud.read('dataset', {_id: parseInt(params['dataset'])}, function(err, results) {
				if (err){
					return callback(err);
				}
				asyncCallback(null, results[0]);
			});
		},

		theme: function(asyncCallback) {
			if (!params['theme']) {
				return asyncCallback(null);
			}
			crud.read('theme', {_id: parseInt(params['theme'])}, function(err, results) {
				if (err){
					return callback(err);
				}
				asyncCallback(null, results[0]);
			});
		},

		locations: function(asyncCallback, results) {

			var locations = locations ? JSON.parse(params['locations']) : null;
			if (locations) {
				return asyncCallback(null,locations);
			}
			crud.read('location', {dataset: parseInt(params['dataset'])}, function(err, resls) {
				if (err){
					return callback(err);
				}
				var ids = [];
				for (var i = 0; i < resls.length; i++) {
					ids.push(resls[i]._id);
				}
				asyncCallback(null, ids);
			});
		},

		topicMap: ['theme', function(asyncCallback, results) {
			if (!results.theme) {
				return asyncCallback(null)
			}
			crud.read('topic', {_id: {$in: results.theme.topics}}, function(err, resls) {
				if (err){
					return callback(err);
				}
				var topicMap = {};

				for (var i = 0; i < resls.length; i++) {
					var row = resls[i];
					topicMap[row._id] = row;
				}
				asyncCallback(null, topicMap);
			});
		}],

		requiredAttrSets: ['topicMap', function(asyncCallback, results) {
			if (!results.topicMap) {
				return asyncCallback(null)
			}
			var requiredTopics = [];
			var allTopics = [];
			var topicMap = results.topicMap;
			for (var topicId in topicMap) {
				var topic = topicMap[topicId];
				allTopics.push(topic._id);
				if (topic.requiresFullRef) {
					requiredTopics.push(topic._id);
				}
			}
			// zatim se requiredtopicneresi, nacita se info o vsech attributsetech pro dane tema
			crud.read('attributeset', {topic: {$in: allTopics}}, function(err, resls) {
				if (err){
					return callback(err);
				}
				var ids = [];
				for (var i = 0; i < resls.length; i++) {
					var attrSet = resls[i];

					if (!attrSet.featureLayers || !attrSet.featureLayers.length) {
						ids.push(attrSet._id);
					}
				}
				asyncCallback(null, ids);
			});
		}],

		layerRefs: ['dataset', 'locations', 'requiredAttrSets', function(asyncCallback, results) {
			var layerRefMap = {};
			var attrLayerRefMap = {};
			var confs = [];
			var attrConfs = [];
			//var attrSets = results.requiredAttrSets || [];
			// zadne attr sets nejsou vyzadovany
			var attrSets = [];
			for (var i = 0; i < results.locations.length; i++) {
				var loc = results.locations[i];
				layerRefMap[loc] = layerRefMap[loc] || {};
				attrLayerRefMap[loc] = attrLayerRefMap[loc] || {};
				for (var j = 0; j < results.dataset.featureLayers.length; j++) {
					var fl = results.dataset.featureLayers[j];
					layerRefMap[loc][fl] = layerRefMap[loc][fl] || {};
					attrLayerRefMap[loc][fl] = attrLayerRefMap[loc][fl] || {};
					for (var k = 0; k < years.length; k++) {
						var year = years[k];
						attrLayerRefMap[loc][fl][year] = attrLayerRefMap[loc][fl][year] || {};
						confs.push({location: loc, year: year, areaTemplate: fl, isData: false});
						for (var l = 0; l < attrSets.length; l++) {
							var attrSet = attrSets[l];
							attrConfs.push({location: loc, year: year, areaTemplate: fl, attributeSet: attrSet, isData: true});
						}

					}

				}
			}
			async.forEach(confs, function(item, eachCallback) {
				crud.read('layerref', item, function(err, resls) {
					if (err){
						return callback(err);
					}
					layerRefMap[item.location][item.areaTemplate][item.year] = resls[0];
					eachCallback(null);
				});
			}, function() {
				async.forEach(attrConfs, function(item, eachCallback) {
					crud.read('layerref', item, function(err, resls) {
						if (err){
							return callback(err);
						}
						if (resls && resls.length) {
							attrLayerRefMap[item.location][item.areaTemplate][item.year][item.attributeSet] = true;
						}
						eachCallback(null);
					});
				}, function() {
					// for (var loc in layerRefMap) {
					// 	for (var fl in layerRefMap[loc]) {
					// 		for (var year in layerRefMap[loc][fl]) {
					// 			// vyrazovani nevhodnych uzemi na zaklade chybejicich attr referenci
					// 			for (var i = 0; i < attrSets.length; i++) {
					// 				var attrLayerRef = null;
					// 				try {
					// 					var attrLayerRef = attrLayerRefMap[loc][fl][year][attrSets[i]];
					// 				} catch (e) {
					// 				}
					// 				if (!attrLayerRef) {
					// 					layerRefMap[loc][fl][year] = null;
					// 					if (fl == results.dataset.featureLayers[0]) {
					// 						for (var j = 0; j < results.locations.length; j++) {
					// 							var currentLoc = results.locations[j];
					// 							if (loc == currentLoc) {
					// 								results.locations = _.difference(results.locations, [currentLoc]);
					// 								break;
					// 							}
					// 						}
					// 					}
					// 					break;
					// 				}
					// 			}
					// 		}
					// 	}
					// }

					return asyncCallback(null, layerRefMap);
				})
			})
		}],

		sql: ['layerRefs', function(asyncCallback, results) {
			if (!params['refreshAreas'] || params['refreshAreas']=='false') {
				return asyncCallback(null, {});
			}
			var locations = results.locations;
			var featureLayers = results.dataset.featureLayers;
			var layerRefMap = results.layerRefs;
			var opened = params['parentgids'] ? JSON.parse(params['parentgids']) : null;
			opened = opened || (params['expanded'] ? JSON.parse(params['expanded']) : {});
			var sql = '';
			for (var i = 0; i < locations.length; i++) {
				var loc = locations[i];
				var locFeatureLayers = params['parentgids'] ? [] : [featureLayers[0]];
				var locOpened = opened[loc];
				for (var key in locOpened) {
					var idx = featureLayers.indexOf(parseInt(key));
					locFeatureLayers.push(featureLayers[idx + 1]);
				}
				locFeatureLayers.sort(function(a, b) {
					return featureLayers.indexOf(a) > featureLayers.indexOf(b);
				});

				for (var j = 0; j < locFeatureLayers.length; j++) {
					var fl = locFeatureLayers[j];
					var layerRef = null;
					try {
						layerRef = layerRefMap[loc][fl][years[0]];
					} catch (e) {
					}
					if (!layerRef){
						continue;
					}
					var flIdx = featureLayers.indexOf(fl);
					var prevFl = flIdx > 0 ? featureLayers[flIdx - 1] : null;
					var leaf = 'FALSE';
					var cont = true;
					for (var k = 0; k < years.length; k++) {
						var curLayerRef = layerRefMap[loc][fl][years[k]];
						if (!curLayerRef) {
							cont = false;
							break;
						}
					}
					if (!cont){
						continue;
					}
					sql += sql ? ' UNION ' : '';
					sql += 'SELECT a.gid,a.parentgid, ' + leaf + ' AS leaf,' + j + ' AS idx,' + layerRef.areaTemplate + ' AS at,' + loc + ' AS loc,' + layerRef._id + ' AS lr, a.name, ST_AsText(a.extent) as extent';

					sql += ' FROM views.layer_' + layerRef._id + ' a';
					for (var k = 1; k < years.length; k++) {
						var yearLayerRef = layerRefMap[loc][fl][years[k]];
						if (!yearLayerRef) {
							sql += ' INNER JOIN views.layer_' + layerRef._id + ' y' + years[k] + ' ON a.gid+1=y' + years[k] + '.gid';
							continue;
						}
						sql += ' INNER JOIN views.layer_' + yearLayerRef._id + ' y' + years[k] + ' ON a.gid=y' + years[k] + '.gid';
					}
					sql += ' WHERE 1=1';
					if (locOpened && prevFl && locOpened[prevFl]) {
						sql += ' AND a.parentgid IN (' + locOpened[prevFl].join(',') + ')';
					}
					// filter.areaTemplates possibly unused, like in Mongo DB theme.areaTemplates is unused. Jon
					if (filter && (filter.areaTemplates[fl] || params.allAreaTemplates)) {
						sql += getFilterSql(filter.filters, 'a.');
					}
				}
			}
			sql += ' ORDER BY idx ASC';
			var client = conn.getPgDataDb();
			client.query(sql, {}, function(err, resls) {

				if (err){
					return callback(err);
				}
				var obj = {};
				if (!fids) {
					obj.areas = resls.rows;
				} else {
					var newRows = [];
					for (var i = 0; i < resls.rows.length; i++) {
						var row = resls.rows[i];
						if (fids[row.loc] && fids[row.loc][row.at] && fids[row.loc][row.at].indexOf(row.gid) > -1) {
							fids[row.loc][row.at] = _.without(fids[row.loc][row.at], row.gid)
						} else {
							newRows.push(row);
						}
					}
					obj.add = newRows;
					obj.remove = fids;
				}
				return asyncCallback(null, obj);
			});

		}],

		leafs: ['sql', function(asyncCallback, results) {
			if (!params['refreshAreas'] || params['refreshAreas']=='false' || params['bypassLeafs']) {
				return asyncCallback(null, null);
			}
			var atMap = {};
			var layerRefsToCheck = [];
			var areas = results.sql.areas || results.sql.add;
			var fidsToIter = params['fids'] ? JSON.parse(params['fids']) : {};
			//console.log(fidsToIter)
			for (var loc in fidsToIter) {
				for (var at in fidsToIter[loc]) {
					atMap[loc] = atMap[loc] || {};
					atMap[loc][at] = atMap[loc][at] || [];

					for (var i = 0; i < fidsToIter[loc][at].length; i++) {
						atMap[loc][at].push(fidsToIter[loc][at][i]);
					}
				}
			}
			for (var i = 0; i < areas.length; i++) {
				var area = areas[i];
				atMap[area.loc] = atMap[area.loc] || {};
				atMap[area.loc][area.at] = atMap[area.loc][area.at] || [];
				atMap[area.loc][area.at].push(area);
			}
			for (var loc in atMap) {
				for (var at in atMap[loc]) {
					var layerRef = null;
					try {
						layerRef = results.layerRefs[loc][at][years[0]];
					} catch (e) {
					}
					var featureLayers = results.dataset.featureLayers;
					var idx = featureLayers.indexOf(parseInt(at));
					var nextAt = featureLayers[idx + 1];
					var nextLayerRef = null;
					try {
						nextLayerRef = results.layerRefs[loc][nextAt][years[0]];
					} catch (e) {
					}
					var areasOrGids = atMap[loc][at];
					areas = _.difference(areas,areasOrGids);
					layerRefsToCheck.push({
						loc: loc,
						at: at,
						nextAt: nextAt,
						layerRef: layerRef,
						nextLayerRef: nextLayerRef,
						areasOrGids: areasOrGids
					});
				}
			}

			var leafMap = {};
			var newAreas = [];
			async.forEach(layerRefsToCheck, function(item, eachCallback) {
				if (!item.nextLayerRef || !item.layerRef) {
					for (var i = 0; i < item.areasOrGids.length; i++) {
						var area = item.areasOrGids[i];
						if (area.gid) {
							area.leaf = true;
							newAreas.push(area);
						} else {
							leafMap[item.loc] = leafMap[item.loc] || {};
							leafMap[item.loc][item.at] = leafMap[item.loc][item.at] || {};
							leafMap[item.loc][item.at][area] = true;
						}
					}
					return eachCallback(null);
				}
				var sql = 'SELECT a.gid,COUNT(b.gid) as cnt FROM views.layer_' + item.layerRef._id + ' a';
				sql += ' LEFT JOIN views.layer_' + item.nextLayerRef._id + ' b';
				sql += ' ON a.gid = b.parentgid';
				// filter.areaTemplates possibly unused, like in Mongo DB theme.areaTemplates is unused. Jon
				if (filter && filter.areaTemplates[item.nextAt]) {
					sql += getFilterSql(filter.filters, 'b.');
				}
				sql += ' GROUP BY (a.gid)';
				var client = conn.getPgDataDb();
				client.query(sql, {}, function(err, resls) {

					if (err){
						return callback(err);
					}
					var partLeafMap = {};
					for (var i=0;i<resls.rows.length;i++) {
						var row = resls.rows[i];
						if (row.cnt <= 0) {
							partLeafMap[row.gid] = true;
						}
					}
					for (var i=0;i<item.areasOrGids.length;i++) {
						var area = item.areasOrGids[i];
						if (area.gid && partLeafMap[area.gid]) {
							area.leaf = true;
						}
						if (area.gid) {
							newAreas.push(area);
						}
						if (!area.gid && partLeafMap[area]) {
							leafMap[item.loc] = leafMap[item.loc] || {};
							leafMap[item.loc][item.at] = leafMap[item.loc][item.at] || {};
							leafMap[item.loc][item.at][area] = true;
						}
					}
					//console.log(item.areasOrGids);
					//console.log(results.sql.areas)
					return eachCallback(null);

				});
			},function(err) {
				areas = _.union(areas,newAreas);
				areas = _.sortBy(areas,'idx');
				var obj = {
					leafMap: leafMap
				};
				if (results.sql.areas) {
					obj['areas'] = areas;
				}
				if (results.sql.add) {
					obj['add'] = areas;
				}
				return asyncCallback(null,obj);
			});
		}],

		symbologies: function(asyncCallback) {
			crud.read('symbology', {}, function(err, resls) {
				if (err) {
					return callback(err);
				}
				var symMap = {};
				for (var i = 0; i < resls.length; i++) {
					var row = resls[i];
					symMap[row._id] = row;
				}
				return asyncCallback(null, symMap);
			});
		},

		layers: ['theme', 'locations', 'topicMap', 'symbologies', 'layerRefs', function(asyncCallback, results) {
			if (!results.theme) {
				return asyncCallback(null);
			}
			var theme = results.theme;
			var topics = theme.topics;
			var layerRefMap = {};
			async.map(topics, function(item, mapCallback) {
				crud.read('areatemplate', {topic: item}, function(err, resls) {
					if (err){
						return callback(err);
					}
					async.forEach(resls, function(at, eachCallback) {
						crud.read('layerref', {$and: [{areaTemplate: at._id}, {year: {$in: years}}, {location: {$in: results.locations}}, {isData: false}]}, function(err, resls2) {
							if (err){
								return callback(err);
							}
							layerRefMap[at._id] = {};
							for (var i = 0; i < resls2.length; i++) {
								var row = resls2[i];
								layerRefMap[at._id][row.location] = layerRefMap[at._id][row.location] || {};
								layerRefMap[at._id][row.location][row.year] = layerRefMap[at._id][row.location][row.year] || [];
								//if (at._id==431) console.log(row);
								layerRefMap[at._id][row.location][row.year].push({
									layer: row.layer,
									wmsAddress: row.wmsAddress,
									wmsLayers: row.wmsLayers
								});
							}
							return eachCallback(null);
						});
					}, function(err) {
						return mapCallback(null, resls);
					});
				});
			}, function(err, map) {
				var obj = {};
				obj.layerRefMap = layerRefMap;
				if (!params['refreshLayers']) {
					return asyncCallback(null, obj);
				}
				var nodes = [];
				var queryTopics = params['queryTopics'] ? JSON.parse(params['queryTopics']) : null;
				for (var i = 0; i < topics.length; i++) {
					var topic = topics[i];
					if (queryTopics && queryTopics.indexOf(topic) < 0) {
						continue;
					}
					var layers = map[i];
//                        var node = {
//                            name: results.topicMap[topic].name,
//                            expanded: true,
//                            type: 'topic',
//                            topic: topic,
//                            checked: null,
//                            children: []
//                        }
					for (var j = 0; j < layers.length; j++) {
						var layer = layers[j];
						var symbologies = layer.symbologies || [];
						if (!symbologies.length) {
							symbologies = [-1];
						}
						for (var k = 0; k < symbologies.length; k++) {
							var symbology = symbologies[k] != -1 ? results.symbologies[symbologies[k]] : null;
							if (symbology && symbology.topic && topics.indexOf(symbology.topic)<0) {
								continue;
							}
							var symbNode = {
								name: layer.name + (symbology ? '-' + symbology.name : ''),
								symbologyId: symbology ? symbology.symbologyName : '#blank#',
								leaf: true,
								at: layer._id,
								layerGroup: layer.layerGroup,
								topic: topic,
								sortIndex: 2.5,
								type: 'topiclayer',
								checked: false
							};
							//node.children.push(symbNode);
							nodes.push(symbNode);
						}
					}
					//nodes.push(node);
				}
				obj.layerNodes = nodes;
				return asyncCallback(null, obj);
			});

		}],

		finish: ['layers', 'leafs', function(asyncCallback, results) {
			res.data = (params['parentgids'] || params['justAreas']) ? (results.leafs ? results.leafs.areas : results.sql.areas) : {
				add: results.leafs ? results.leafs.add : results.sql.add,
				leafMap: results.leafs ? results.leafs.leafMap : null,
				auRefMap: results.layerRefs,
				remove: results.sql.remove,
				attrSets: results.requiredAttrSets,
				areas: results.leafs ? results.leafs.areas : results.sql.areas,
				layerRefMap: results.layers ? results.layers.layerRefMap : null,
				layerNodes: results.layers ? results.layers.layerNodes : null
			};
			return callback(null);
		}]

	});
}


var getFilterSql = function(atFilter, prefix) {
	var sql = '';
	for (var i = 0; i < atFilter.length; i++) {
		var attr = atFilter[i];
		var attrName = prefix + 'as_' + attr.as + '_attr_' + attr.attr;
		var normAttrName = null;
		if (attr.normType == 'area') {
			normAttrName = prefix + 'area';
		}
		if (attr.normType == 'attributeset') {
			normAttrName = prefix + 'as_' + attr.normAs + '_attr_' + attr.attr;
		}
		if (attr.normType == 'attribute') {
			normAttrName = prefix + 'as_' + attr.normAs + '_attr_' + attr.normAttr;
		}

		var attrSql = normAttrName ? (attrName + '/' + normAttrName + '*100') : attrName;
		sql += ' AND ' + attrSql + '>=' + attr.min;
		sql += ' AND ' + attrSql + '<=' + attr.max;
	}
	return sql;
};


module.exports = {
	getThemeYearConf: getThemeYearConf,
	getLocationConf: getLocationConf
};
