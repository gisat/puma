var crud = require('../rest/crud');
var async = require('async');
var us = require('underscore')

var conn = require('../common/conn');

function getLocationConf(params, req, res, callback) {
    var opts = {
        dataset: function(asyncCallback) {
            crud.read('dataset', {}, function(err, results) {
                if (err)
                    return callback(err);
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
                if (err)
                    return callback(err);
                var datasetMap = {};
                for (var i=0;i<results.length;i++) {
                    var result = results[i];
                    if (!result.dataset) continue;
                    datasetMap[result.dataset] = datasetMap[result.dataset] || [];
                    datasetMap[result.dataset].push(result)
                }
                
                asyncCallback(null, datasetMap);
            });
        },
        singleLocationAreas: ['dataset','datasetMap',function(asyncCallback,results) {
            var datasetMap = results.datasetMap;
            var locToQuery = [];
            var resultArr = [];
            for (var datasetId in datasetMap) {
                var locs = datasetMap[datasetId];
                
                var dataset = results.dataset[datasetId];
                for (var i=0;i<locs.length;i++) {
                    locToQuery.push({location: locs[i]._id,areaTemplate: dataset.featureLayers[0],isData:false,dataset:datasetId})    
                }
            }
            console.log(locToQuery);
            var client = conn.getPgDb();
            async.forEach(locToQuery, function(item, eachCallback) {
                var datasetId = item.dataset;
                delete item.dataset;
                
                crud.read('layerref', item, function(err, results) {
                    if (err)
                        return callback(err)
                    if (!results.length)
                        return eachCallback(null);
                    var layerRef = results[0];
                    var sql = 'SELECT gid,name FROM views.layer_' + layerRef._id;
                    client.query(sql, {}, function(err, resls) {
                        if (err)
                            return callback(err);
                        for (var i = 0; i < resls.rows.length; i++) {
                            var row = resls.rows[i];
                            resultArr.push({name: row.name,locGid: row.gid,id:item.location+'_'+row.gid,dataset:datasetId,location:item.location,at:item.areaTemplate})
                        }
                        eachCallback(null)

                    })
                })
            },function() {
                if (resultArr.length>1) {
                    resultArr.push({name:'All',id: 0})
                }
                res.data = resultArr;
                return callback();
            })
        }]
    }
    async.auto(opts);
}

function getThemeYearConf(params, req, res, callback) {
    if (!params['dataset'] || !params['years']) {
        res.data = [];
        return callback(null);
    }
    var years = JSON.parse(params['years']);
    var fids = params['fids'] ? JSON.parse(params['fids']) : null;
    var filter = params['filter'] ? JSON.parse(params['filter']) : null;
    var opts = {
        dataset: function(asyncCallback) {
            crud.read('dataset', {_id: parseInt(params['dataset'])}, function(err, results) {
                if (err)
                    return callback(err);
                asyncCallback(null, results[0]);
            });
        },
        theme: function(asyncCallback) {
            if (!params['theme']) {
                return asyncCallback(null);
            }
            crud.read('theme', {_id: parseInt(params['theme'])}, function(err, results) {
                if (err)
                    return callback(err);
                asyncCallback(null, results[0]);
            });
        },
        locations: function(asyncCallback, results) {
            
            var locations = locations ? JSON.parse(params['locations']) : null;
            if (locations) {
                return asyncCallback(null,locations);
            }
            crud.read('location', {dataset: parseInt(params['dataset'])}, function(err, resls) {
                if (err)
                    return callback(err);
                var ids = [];
                for (var i = 0; i < resls.length; i++) {
                    ids.push(resls[i]._id)
                }
                asyncCallback(null, ids);
            });
        },
        topicMap: ['theme', function(asyncCallback, results) {
                if (!results.theme) {
                    return asyncCallback(null)
                }
                crud.read('topic', {_id: {$in: results.theme.topics}}, function(err, resls) {
                    if (err)
                        return callback(err);
                    var topicMap = {};

                    for (var i = 0; i < resls.length; i++) {
                        var row = resls[i]
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
                    if (err)
                        return callback(err);
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
                            confs.push({location: loc, year: year, areaTemplate: fl, isData: false})
                            for (var l = 0; l < attrSets.length; l++) {
                                var attrSet = attrSets[l];
                                attrConfs.push({location: loc, year: year, areaTemplate: fl, attributeSet: attrSet, isData: true})
                            }

                        }

                    }
                }
                console.log(confs)
                async.forEach(confs, function(item, eachCallback) {
                    crud.read('layerref', item, function(err, resls) {
                        if (err)
                            return callback(err);
                        layerRefMap[item.location][item.areaTemplate][item.year] = resls[0];
                        eachCallback(null);
                    });
                }, function() {
                    async.forEach(attrConfs, function(item, eachCallback) {
                        crud.read('layerref', item, function(err, resls) {
                            if (err)
                                return callback(err);
                            if (resls && resls.length) {
                                attrLayerRefMap[item.location][item.areaTemplate][item.year][item.attributeSet] = true;
                            }
                            eachCallback(null);
                        });
                    }, function() {
                        console.log(layerRefMap)
                        for (var loc in layerRefMap) {
                            for (var fl in layerRefMap[loc]) {
                                for (var year in layerRefMap[loc][fl]) {
                                    // vyrazovani nevhodnych uzemi na zaklade chybejicich attr referenci
//                                    for (var i = 0; i < attrSets.length; i++) {
//                                        var attrLayerRef = null;
//                                        try {
//                                            var attrLayerRef = attrLayerRefMap[loc][fl][year][attrSets[i]]
//                                        }
//                                        catch (e) {
//                                        }
//                                        if (!attrLayerRef) {
//                                            layerRefMap[loc][fl][year] = null;
//                                            if (fl == results.dataset.featureLayers[0]) {
//                                                for (var j = 0; j < results.locations.length; j++) {
//                                                    var currentLoc = results.locations[j];
//                                                    if (loc == currentLoc) {
//                                                        results.locations = us.difference(results.locations, [currentLoc]);
//                                                        break;
//                                                    }
//                                                }
//                                            }
//                                            break;
//                                        }
//                                    }
                                }
                            }
                        }

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
                        locFeatureLayers.push(featureLayers[idx + 1])
                    }
                    locFeatureLayers.sort(function(a, b) {
                        return featureLayers.indexOf(a) > featureLayers.indexOf(b);
                    })

                    for (var j = 0; j < locFeatureLayers.length; j++) {
                        var fl = locFeatureLayers[j];
                        var layerRef = null;
                        try {
                            layerRef = layerRefMap[loc][fl][years[0]];
                        }
                        catch (e) {
                        }
                        if (!layerRef)
                            continue;
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
                        if (!cont)
                            continue;
                        sql += sql ? ' UNION ' : '';
                        sql += 'SELECT a.gid,a.parentgid, ' + leaf + ' AS leaf,' + j + ' AS idx,' + layerRef.areaTemplate + ' AS at,' + loc + ' AS loc,' + layerRef._id + ' AS lr, a.name, ST_AsText(a.extent) as extent';

                        sql += ' FROM views.layer_' + layerRef._id + ' a';
                        for (var k = 1; k < years.length; k++) {
                            var yearLayerRef = layerRefMap[loc][fl][years[k]];
                            if (!yearLayerRef) {
                                sql += ' INNER JOIN views.layer_' + layerRef._id + ' y' + years[k] + ' ON a.gid+1=y' + years[k] + '.gid'
                                continue;
                            }
                            sql += ' INNER JOIN views.layer_' + yearLayerRef._id + ' y' + years[k] + ' ON a.gid=y' + years[k] + '.gid'
                        }
                        sql += ' WHERE 1=1'
                        if (locOpened && prevFl && locOpened[prevFl]) {
                            sql += ' AND a.parentgid IN (' + locOpened[prevFl].join(',') + ')';
                        }
                        if (filter && filter.areaTemplates[fl]) {
                            sql += getFilterSql(filter.filters, 'a.');
                        }
                    }
                }
                sql += ' ORDER BY idx ASC'
                var client = conn.getPgDb();
                client.query(sql, {}, function(err, resls) {

                    if (err)
                        return callback(err);
                    var obj = {};
                    if (!fids) {
                        obj.areas = resls.rows;
                    }
                    else {
                        var newRows = [];
                        for (var i = 0; i < resls.rows.length; i++) {
                            var row = resls.rows[i];
                            if (fids[row.loc] && fids[row.loc][row.at] && fids[row.loc][row.at].indexOf(row.gid) > -1) {
                                fids[row.loc][row.at] = us.without(fids[row.loc][row.at], row.gid)
                            }
                            else {
                                newRows.push(row);
                            }
                        }
                        obj.add = newRows;
                        obj.remove = fids;
                    }
                    return asyncCallback(null, obj)
                })

            }],
        leafs: ['sql', function(asyncCallback, results) {
                if (!params['refreshAreas'] || params['refreshAreas']=='false') {
                    return asyncCallback(null, {});
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
                console.log(atMap)
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
                        }
                        catch (e) {
                        }
                        var featureLayers = results.dataset.featureLayers;
                        var idx = featureLayers.indexOf(parseInt(at));
                        var nextAt = featureLayers[idx + 1];
                        var nextLayerRef = null;
                        try {
                            nextLayerRef = results.layerRefs[loc][nextAt][years[0]];
                        }
                        catch (e) {
                        }
                        var areasOrGids = atMap[loc][at];
                        areas = us.difference(areas,areasOrGids);
                        layerRefsToCheck.push({
                            loc: loc,
                            at: at,
                            nextAt: nextAt,
                            layerRef: layerRef,
                            nextLayerRef: nextLayerRef,
                            areasOrGids: areasOrGids
                        })
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
                            }
                            else {
                                console.log(leafMap)
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
                    if (filter && filter.areaTemplates[item.nextAt]) {
                        sql += getFilterSql(filter.filters, 'b.');
                    }
                    sql += ' GROUP BY (a.gid)';
                    var client = conn.getPgDb();
                    client.query(sql, {}, function(err, resls) {
                        
                        if (err)
                            return callback(err);
                        var partLeafMap = {};
                        for (var i=0;i<resls.rows.length;i++) {
                            var row = resls.rows[i];
                            
                            //console.log(row);
                            if (row.cnt>0) {}
                            else {
                                partLeafMap[row.gid] = true;
                            }
                        }
                        //console.log(partLeafMap)
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
                        return eachCallback(null)
                        
                        
                    });
                },function(err) {
                    areas = us.union(areas,newAreas);
                    console.log(areas)
                    areas = us.sortBy(areas,'idx');
                    var obj = {
                        leafMap: leafMap
                    }
                    if (results.sql.areas) {
                        obj['areas'] = areas;
                    }
                    if (results.sql.add) {
                        obj['add'] = areas;
                    }
                    return asyncCallback(null,obj);
                })


            }],
        symbologies: function(asyncCallback) {
            crud.read('symbology', {}, function(err, resls) {
                if (err)
                    return callback(err);
                var symMap = {};
                for (var i = 0; i < resls.length; i++) {
                    var row = resls[i];
                    symMap[row._id] = row;
                }
                return asyncCallback(null, symMap);
            })
        },
        layers: ['theme', 'locations', 'topicMap', 'symbologies', 'layerRefs', function(asyncCallback, results) {
                if (!results.theme) {
                    return asyncCallback(null);
                }
                var theme = results.theme;
                var topics = theme.topics;
                var layerRefMap = {};
                console.log(results.locations)
                async.map(topics, function(item, mapCallback) {
                    crud.read('areatemplate', {topic: item}, function(err, resls) {
                        if (err)
                            return callback(err);
                        async.forEach(resls, function(at, eachCallback) {
                            crud.read('layerref', {$and: [{areaTemplate: at._id}, {year: {$in: years}}, {location: {$in: results.locations}}, {isData: false}]}, function(err, resls2) {
                                if (err)
                                    return callback(err);
                                layerRefMap[at._id] = {};
                                for (var i = 0; i < resls2.length; i++) {
                                    var row = resls2[i];
                                    layerRefMap[at._id][row.location] = layerRefMap[at._id][row.location] || {};
                                    layerRefMap[at._id][row.location][row.year] = layerRefMap[at._id][row.location][row.year] || [];
                                    //if (at._id==431) console.log(row)
                                    layerRefMap[at._id][row.location][row.year].push({
                                        layer: row.layer,
                                        wmsAddress: row.wmsAddress,
                                        wmsLayers: row.wmsLayers
                                    })
                                }
                                return eachCallback(null)
                            })
                        }, function(err) {
                            return mapCallback(null, resls)
                        })
                    })
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
                                    continue
                                }
                                else {
                                    //console.log('found')
                                }
                                var symbNode = {
                                    name: layer.name + (symbology ? '-' + symbology.name : ''),
                                    symbologyId: symbology ? symbology.symbologyName : '#blank#',
                                    leaf: true,
                                    at: layer._id,
                                    topic: topic,
                                    sortIndex: 2.5,
                                    type: 'topiclayer',
                                    checked: false
                                }
                                //node.children.push(symbNode);
                                nodes.push(symbNode)
                            }
                        }
                        //nodes.push(node);
                    }
                    obj.layerNodes = nodes;
                    return asyncCallback(null, obj);


                })

            }],
        finish: ['layers', 'leafs', function(asyncCallback, results) {
                
                res.data = (params['parentgids']) ? (results.leafs ? results.leafs.areas : results.sql.areas) : {
                    add: results.leafs ? results.leafs.add : results.sql.add,
                    leafMap: results.leafs ? results.leafs.leafMap : null,
                    auRefMap: results.layerRefs,
                    remove: results.sql.remove,
                    attrSets: results.requiredAttrSets,
                    areas: results.leafs ? results.leafs.areas : results.sql.areas,
                    layerRefMap: results.layers ? results.layers.layerRefMap : null,
                    layerNodes: results.layers ? results.layers.layerNodes : null
                }
                return callback(null);
            }]
    }
    async.auto(opts)
}


var getFilterSql = function(atFilter, prefix) {
    var sql = '';
    for (var i = 0; i < atFilter.length; i++) {
        var attr = atFilter[i];
        var attrName = prefix + 'as_' + attr.as + '_attr_' + attr.attr;
        var normAttrName = null;
        if (attr.normType == 'area') {
            normAttrName = prefix + 'area'
        }
        if (attr.normType == 'attributeset') {
            normAttrName = prefix + 'as_' + attr.normAs + '_attr_' + attr.attr;
        }
        if (attr.normType == 'attribute') {
            normAttrName = prefix + 'as_' + attr.normAs + '_attr_' + attr.normAttr;
        }

        var attrSql = normAttrName ? (attrName + '/' + normAttrName + '*100') : attrName
        sql += ' AND ' + attrSql + '>=' + attr.min;
        sql += ' AND ' + attrSql + '<=' + attr.max;
    }
    return sql;
}


module.exports = {
    getThemeYearConf: getThemeYearConf,
    getLocationConf: getLocationConf
}
