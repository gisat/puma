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
					logger.error("theme#getLocationConf dataset. Error: ", err);
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
					logger.error("theme#getLocationConf datasetMap. Error: ", err);
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
								logger.error("theme#getLocationConf getLocationsFromDB. Error: ", err);
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
			logger.error("theme#getLocationsFromDB Read Layerref. Error: ", err);
			return callback(err);
		}
		if (!layerRefs.length){
			return callback(null);
		}
		var layerRef = layerRefs[0];
		var sql = 'SELECT gid,name FROM views.layer_' + layerRef._id;
		client.query(sql, {}, function(err, resls) {
			if (err){
				logger.error("theme#getLocationsFromDB Sql: ", sql, " Error: ", err);
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
					logger.error("theme#getThemeYearConf Read dataset. Error: ", err);
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
					logger.error("theme#getThemeYearConf Read theme. Error: ", err);
					return callback(err);
				}
				asyncCallback(null, results[0]);
			});
		},

		locations: function(asyncCallback) {
			// var locations = locations ? JSON.parse(params['locations']) : null;
			// if (locations) {
			// 	return asyncCallback(null,locations);
			// }
			crud.read('location', {dataset: parseInt(params['dataset'])}, function(err, resls) {
				if (err){
					logger.error("theme#getThemeYearConf locations Read Location. Error: ", err);
					return callback(err);
				}
				var ids = [];
				for (var i = 0; i < resls.length; i++) {
					ids.push(resls[i]._id);
				}
				//asyncCallback(null, ids);
				asyncCallback(null, resls);
			});
		},

		topicMap: ['theme', function(asyncCallback, results) {
			if (!results.theme) {
				return asyncCallback(null)
			}
			crud.read('topic', {_id: {$in: results.theme.topics}}, function(err, resls) {
				if (err){
					logger.error("theme#getThemeYearConf topicMap Read Theme. Error: ", err);
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
					logger.error("theme#getThemeYearConf topicMap Read attibuteset. Error: ", err);
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
			for (var i = 0; i < results.locations.length; i++) { // iterate Locations
				var locationID = results.locations[i]._id;
				layerRefMap[locationID] = layerRefMap[locationID] || {};
				attrLayerRefMap[locationID] = attrLayerRefMap[locationID] || {};
				for (var j = 0; j < results.dataset.featureLayers.length; j++) { // iterate AU level area templates
					var areaTemplateID = results.dataset.featureLayers[j];
					layerRefMap[locationID][areaTemplateID] = layerRefMap[locationID][areaTemplateID] || {};
					attrLayerRefMap[locationID][areaTemplateID] = attrLayerRefMap[locationID][areaTemplateID] || {};
					for (var k = 0; k < years.length; k++) { // iterate Years
						var yearID = years[k];
						attrLayerRefMap[locationID][areaTemplateID][yearID] = attrLayerRefMap[locationID][areaTemplateID][yearID] || {};
						confs.push({
							location: locationID,
							year: yearID,
							areaTemplate: areaTemplateID,
							isData: false
						});
						for (var l = 0; l < attrSets.length; l++) { // iterate Attribute Sets
							var attrSet = attrSets[l];
							attrConfs.push({
								location: locationID,
								year: yearID,
								areaTemplate: areaTemplateID,
								attributeSet: attrSet,
								isData: true
							});
						}
					}
				}
			}
			async.forEach(confs, function(item, eachCallback) {
				crud.read('layerref', item, function(err, resls) {
					if (err){
						logger.error("theme#getThemeYearConf Configurations Read layerref. Error: ", err);
						return callback(err);
					}
					layerRefMap[item.location][item.areaTemplate][item.year] = resls[0];
					eachCallback(null);
				});
			}, function() {
				async.forEach(attrConfs, function(item, eachCallback) {
					crud.read('layerref', item, function(err, resls) {
						if (err){
							logger.error("theme#getThemeYearConf Configurations Read layerref. Error: ", err);
							return callback(err);
						}
						if (resls && resls.length) {
							attrLayerRefMap[item.location][item.areaTemplate][item.year][item.attributeSet] = true;
						}
						eachCallback(null);
					});
				}, function() {
					/*for (var loc in layerRefMap) {
						for (var areaTemplateID in layerRefMap[loc]) {
							for (var yearID in layerRefMap[loc][areaTemplateID]) {
								// vyrazovani nevhodnych uzemi na zaklade chybejicich attr referenci
								for (var i = 0; i < attrSets.length; i++) {
									var attrLayerRef = null;
									try {
										var attrLayerRef = attrLayerRefMap[loc][areaTemplateID][yearID][attrSets[i]];
									} catch (e) {
									}
									if (!attrLayerRef) {
										layerRefMap[loc][areaTemplateID][yearID] = null;
										if (areaTemplateID == results.dataset.featureLayers[0]) {
											for (var j = 0; j < results.locations.length; j++) { // !!! out of date. results.locations now contains location objects instead IDs!
												var currentLoc = results.locations[j];
												if (loc == currentLoc) {
													results.locations = _.difference(results.locations, [currentLoc]);
													break;
												}
											}
										}
										break;
									}
								}
							}
						}
					}*/

					return asyncCallback(null, layerRefMap);
				});
			});
		}],

		sql: ['layerRefs', 'locations', function(asyncCallback, results) {
			if (!params['refreshAreas'] || params['refreshAreas']=='false') {
				return asyncCallback(null, {});
			}
			var locations = results.locations;
			var areaTemplates = results.dataset.featureLayers; // areaTemplates renamed from featureLayers
			var layerRefMap = results.layerRefs;
			var opened = params['parentgids'] ? JSON.parse(params['parentgids']) : null;
			opened = opened || (params['expanded'] ? JSON.parse(params['expanded']) : {});
			var sql = '';
			for (var i = 0; i < locations.length; i++) {
				var location = locations[i];
				var locationId = location._id;
				var locAreaTemplates = params['parentgids'] ? [] : [areaTemplates[0]];
				var locOpened = opened[locationId];
				for (var key in locOpened) {
					var idx = areaTemplates.indexOf(parseInt(key));
					locAreaTemplates.push(areaTemplates[idx + 1]);
				}
				locAreaTemplates.sort(function(a, b) {
					return areaTemplates.indexOf(a) > areaTemplates.indexOf(b);
				});

				for (var j = 0; j < locAreaTemplates.length; j++) {
					var areaTemplateId = locAreaTemplates[j];
					var areaTemplateIndex = areaTemplates.indexOf(areaTemplateId);
					var prevAreaTemplate = areaTemplateIndex > 0 ? areaTemplates[areaTemplateIndex - 1] : null;
					var topmostAT = (location.hasOwnProperty("bbox") && location.bbox!="" && !prevAreaTemplate); // {bool} topmost area template in normal place (not multiplace)
					var leaf = 'FALSE';
					
					var layerRef = null;
					try {
						layerRef = layerRefMap[locationId][areaTemplateId][years[0]];
					} catch (e) {
						logger.info("theme#getThemeYearConf. Some reference doesn't exist. Error: ", e);
					}
					if (!layerRef){
						continue;
					}

					// abort if layerref for some year is missing
					var abort = false;
					for (var k = 0; k < years.length; k++) {
						var curLayerRef = layerRefMap[locationId][areaTemplateId][years[k]];
						if (!curLayerRef) {
							abort = true;
							break;
						}
					}
					if (abort){
						continue;
					}

					if(topmostAT && location.bbox) {
						let parts = location.bbox.split(',');
						var envelope = '';
						if(parts.length > 4) {
							console.error('Wrong BBOX. ', location);
						}
						parts.forEach(function(part){
							envelope += part + '::double precision,';
						});
						if(envelope.length > 0) {
							envelope = envelope.substr(0, envelope.length - 1)
						}
					}

					sql += sql ? ' UNION ' : '';
					sql += 'SELECT a.gid::text, a.parentgid::text, ' + leaf + ' AS leaf,' + j + ' AS idx,' + layerRef.areaTemplate + ' AS at,' + locationId + ' AS loc,' + layerRef._id + ' AS lr';
					if (topmostAT) {
						sql += ", '" + location.name.replace("'", "\\'") + "'::text AS name";
						sql += ", ST_AsText(ST_Envelope(ST_MakeEnvelope("+envelope+"))) AS extent";
						sql += ", TRUE AS definedplace";
					} else {
						sql += ', a.name::text';
						sql += ', ST_AsText(a.extent) AS extent';
						sql += ", FALSE AS definedplace";
					}

					sql += ' FROM views.layer_' + layerRef._id + ' a';
					for (var k = 1; k < years.length; k++) {
						var yearLayerRef = layerRefMap[locationId][areaTemplateId][years[k]];
						if (!yearLayerRef) {
							sql += ' INNER JOIN views.layer_' + layerRef._id + ' y' + years[k] + ' ON a.gid+1=y' + years[k] + '.gid';
							continue;
						}
						sql += ' INNER JOIN views.layer_' + yearLayerRef._id + ' y' + years[k] + ' ON a.gid=y' + years[k] + '.gid';
					}
					sql += ' WHERE 1=1';
					logger.info("theme# getThemeYearConf, auto:sql prevAreaTemplate:",prevAreaTemplate," locOpened:", locOpened);
					if (locOpened && prevAreaTemplate && locOpened[prevAreaTemplate] && locOpened[prevAreaTemplate][0] !== null) {
						sql += ' AND a.parentgid IN (\'' + locOpened[prevAreaTemplate].join('\',\'') + '\')';
					}
					// filter.areaTemplates possibly unused, like in Mongo DB theme.areaTemplates is unused. Jon
					if (filter && (filter.areaTemplates[areaTemplateId] || params.allAreaTemplates)) {
						sql += getFilterSql(filter.filters, 'a.');
					}
				}
			}
			sql += ' ORDER BY idx ASC';
			var client = conn.getPgDataDb();
			logger.info("theme# getThemeYearConf, auto:sql SQL:", sql);
			client.query(sql, {}, function(err, resls) {

				if (err){
					logger.error("theme# getThemeYearConf. SQL: ", sql, " Error: ", err);
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
						logger.warn("theme#getThemeYearConf. An issue with retrieving layerref. Error: ", e);
					}
					var featureLayers = results.dataset.featureLayers;
					var idx = featureLayers.indexOf(parseInt(at));
					var nextAt = featureLayers[idx + 1];
					var nextLayerRef = null;
					try {
						nextLayerRef = results.layerRefs[loc][nextAt][years[0]];
					} catch (e) {
						logger.warn("theme#getThemeYearConf. An issue with retrieving next layerref. Error: ", e);
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
				var sql = 'SELECT a.gid::text,COUNT(b.gid) as cnt FROM views.layer_' + item.layerRef._id + ' a';
				sql += ' LEFT JOIN views.layer_' + item.nextLayerRef._id + ' b';
				sql += ' ON a.gid::text = b.parentgid::text';
				// filter.areaTemplates possibly unused, like in Mongo DB theme.areaTemplates is unused. Jon
				if (filter && filter.areaTemplates[item.nextAt]) {
					sql += getFilterSql(filter.filters, 'b.');
				}
				sql += ' GROUP BY (a.gid)';
				var client = conn.getPgDataDb();
				client.query(sql, {}, function(err, resls) {

					if (err){
						logger.error("theme#getThemeYearConf. Sql:", sql, " Error: ", err);
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
					logger.error("theme#getThemeYearConf. Read symbologies. Error: ", err);
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
			var locationIDs = [];
			for (var i = 0; i < results.locations.length; i++) {
				locationIDs.push(results.locations[i]._id);
			}

			var theme = results.theme;
			var topics = theme.topics;
			var layerRefMap = {};
			async.map(topics, function(item, mapCallback) {
				crud.read('areatemplate', {topic: item}, function(err, resls) {
					if (err){
						logger.error("theme#getThemeYearConf. Read areatemplate. Error: ", err);
						return callback(err);
					}
					async.forEach(resls, function(at, eachCallback) {
						crud.read('layerref', {$and: [{areaTemplate: at._id}, {year: {$in: years}}, {location: {$in: locationIDs}}, {isData: false}]}, function(err, resls2) {
							if (err){
								logger.error("theme#getThemeYearConf. Read layerref. Error: ", err);
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
						if(err) {
							logger.error("theme#getThemeYearConf. async.forEach Error in callback: ", err);
						}
						return mapCallback(null, resls);
					});
				});
			}, function(err, map) {
				var obj = {};
				logger.info("theme# getThemeYearConf, layerRefs; layerRefMap before save to obj:", layerRefMap);
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
							var symbNode = {
								name: layer.name + (symbology ? '-' + symbology.name : ''),
								symbologyId: symbology ? symbology.symbologyName || symbology.id : '#blank#', // TODO: Fix. Right now it expects that the symbology was correctly created.
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
