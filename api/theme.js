var crud = require('../rest/crud');
var async = require('async');
var us = require('underscore')

var conn = require('../common/conn');



function getThemeYearConf(params, req, res, callback) {
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
            crud.read('theme', {_id: parseInt(params['theme'])}, function(err, results) {
                if (err)
                    return callback(err);
                asyncCallback(null, results[0]);
            });
        },
        locations: function(asyncCallback,results) {
            if (params['locations']) {
                return asyncCallback(null, JSON.parse(params['locations']));
            }
            crud.read('location', {dataset: parseInt(params['dataset'])}, function(err, resls) {
                if (err)
                    return callback(err);
                var ids = [];
                for (var i=0;i<resls.length;i++) {
                    ids.push(resls[i]._id)
                }
                asyncCallback(null, ids);
            });
        },
        topicMap: ['theme',function(asyncCallback,results) {
            crud.read('topic', {_id: {$in:results.theme.topics}}, function(err, resls) {
                if (err)
                    return callback(err);
                var topicMap = {};
                
                for (var i=0;i<resls.length;i++) {
                    var row = resls[i]
                    topicMap[row._id] = row;
                }
                asyncCallback(null, topicMap);
            });
        }],
        requiredAttrSets: ['topicMap',function(asyncCallback,results) {
                var requiredTopics = [];
                var topicMap = results.topicMap;
                for (var topicId in topicMap) {
                    var topic = topicMap[topicId];
                    if (topic.requiresFullRef) {
                        requiredTopics.push(topic._id);
                    }
                }
                console.log(requiredTopics)
                crud.read('attributeset', {topic: {$in:requiredTopics}}, function(err, resls) {
                    if (err)
                        return callback(err);
                    var ids = [];
                    for (var i=0;i<resls.length;i++) {
                        var attrSet = resls[i];
                        if (!attrSet.featureLayers || !attrSet.featureLayers.length) {
                            ids.push(attrSet._id);
                        }
                    }
                    asyncCallback(null,ids);
                });
        }],
        layerRefs: ['dataset','locations','requiredAttrSets',function(asyncCallback,results) {
            var layerRefMap = {};
            var attrLayerRefMap = {};
            var confs = [];
            var attrConfs = [];
            var attrSets = results.requiredAttrSets;
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
                console.log(attrLayerRefMap)
                for (var loc in layerRefMap) {
                    for (var fl in layerRefMap[loc]) {
                        for (var year in layerRefMap[loc][fl]) {
                            
                            for (var i=0;i<attrSets.length;i++) {
                                var attrLayerRef = null;
                                try {
                                    var attrLayerRef = attrLayerRefMap[loc][fl][year][attrSets[i]]
                                }
                                catch(e) {}
                                if (!attrLayerRef) {
                                    layerRefMap[loc][fl][year] = null;
                                    if (fl==results.dataset.featureLayers[0]) {
                                        console.log('here')
                                        for (var j=0;j<results.locations.length;j++) {
                                            var currentLoc = results.locations[j];
                                            if (loc==currentLoc) {
                                                results.locations = us.difference(results.locations,[currentLoc]);
                                                console.log(results.locations)
                                                break;
                                            }
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            
                return asyncCallback(null,layerRefMap);
            })
            })
        }],
        sql: ['layerRefs',function(asyncCallback,results) {
                if (!params['refreshAreas']) {
                return asyncCallback(null,{});
            }
            var locations = results.locations;
            var featureLayers = results.dataset.featureLayers;
            var layerRefMap = results.layerRefs;
            var opened = params['expanded'] ? JSON.parse(params['expanded']) : {};
            var sql = '';
            for (var i = 0; i < locations.length; i++) {
                var loc = locations[i];
                var locFeatureLayers = [featureLayers[0]];
                var locOpened = opened[loc];
                for (var key in locOpened) {
                    var idx = featureLayers.indexOf(parseInt(key));
                    locFeatureLayers.push(featureLayers[idx + 1])
                }
                locFeatureLayers.sort(function(a,b) {
                    return featureLayers.indexOf(a)>featureLayers.indexOf(b);
                })
                
                for (var j = 0; j < locFeatureLayers.length; j++) {
                    var fl = locFeatureLayers[j];
                    var layerRef = null;
                    try {
                        layerRef = layerRefMap[loc][fl][years[0]];
                    
                    }
                    catch (e) {}
                    if (!layerRef)
                        continue;

                    var flIdx = featureLayers.indexOf(fl);
                    var nextFl = featureLayers[flIdx + 1];
                    var prevFl = flIdx > 0 ? featureLayers[flIdx - 1] : null;
                    var leaf = 'FALSE';
                    var cont = true;
                    for (var k = 0; k < years.length; k++) {
                        var curLayerRef = layerRefMap[loc][fl][years[k]];
                        if (!curLayerRef) {
                            cont = false;
                            break;
                        }
                        var nextLayerRef = nextFl ? layerRefMap[loc][nextFl][years[k]] : null;
                        if (!nextLayerRef) {
                            leaf = 'TRUE';
                            break;
                        }
                    }
                    if (!cont)
                        continue;

                    sql += sql ? ' UNION ' : '';
                    sql += 'SELECT a.gid,a.parentgid, ' + leaf + ' AS leaf,'+j+' AS idx,' + layerRef.areaTemplate + ' AS at,' + loc + ' AS loc,' + layerRef._id + ' AS lr, a.name, ST_AsText(a.extent) as extent';

                    sql += ' FROM views.layer_' + layerRef._id + ' a';
                    var allYears = true;
                    for (var k = 1; k < years.length; k++) {
                        var yearLayerRef = layerRefMap[loc][fl][years[k]];
                        if (!yearLayerRef) {
                            allYears = false;
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
            console.log(sql)
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
                    for (var i=0;i<resls.rows.length;i++) {
                        var row = resls.rows[i];
                        if (fids[row.loc] && fids[row.loc][row.at] && fids[row.loc][row.at].indexOf(row.gid)>-1) {
                            fids[row.loc][row.at] = us.without(fids[row.loc][row.at],row.gid)
                        }
                        else {
                            newRows.push(row);
                        }
                    } 
                    obj.add = newRows;
                    obj.remove = fids;
                }
                return asyncCallback(null,obj)
            })

        }],
        symbologies: function(asyncCallback) {
            crud.read('symbology',{},function(err,resls) {
                if (err) return callback(err);
                var symMap = {};
                for (var i=0;i<resls.length;i++) {
                    var row = resls[i];
                    symMap[row._id] = row;
                }
                return asyncCallback(null,symMap);
            })
        },
        layers: ['theme','locations','topicMap','symbologies','layerRefs',function(asyncCallback,results) {
            var theme = results.theme;
            var topics = theme.topics;
            var layerRefMap = {};
            console.log(results.locations)
            async.map(topics,function(item,mapCallback) {
                crud.read('areatemplate',{topic:item},function(err,resls) {
                    if (err) return callback(err);
                    async.forEach(resls,function(at,eachCallback) {
                        crud.read('layerref',{$and:[{areaTemplate:at._id},{year:{$in:years}},{location:{$in:results.locations}},{isData:false}]}, function(err,resls2) {
                            if (err) return callback(err);
                            layerRefMap[at._id] = {};
                            for (var i=0;i<resls2.length;i++) {
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
                    },function(err) {
                        return mapCallback(null,resls)
                    })
                })
            },function(err,map) {
                var obj = {};
                obj.layerRefMap = layerRefMap;
                if (!params['refreshLayers']) {
                    return asyncCallback(null,obj);
                }
                var nodes = [];
                var queryTopics = params['queryTopics'] ? JSON.parse(params['queryTopics']) : null;
                for (var i=0;i<topics.length;i++) {
                    var topic = topics[i];
                    if (queryTopics && queryTopics.indexOf(topic)<0) {
                        continue;
                    }
                    var layers = map[i];
                    var node = {
                        name: results.topicMap[topic].name,
                        expanded: true,
                        type: 'topic',
                        topic: topic,
                        checked: null,
                        children: []
                    }
                    for (var j=0;j<layers.length;j++) {
                        var layer = layers[j];
                        var symbologies = layer.symbologies || [];
                        if (!symbologies.length) {
                            symbologies = [-1];
                        }
                        for (var k=0;k<symbologies.length;k++) {
                            var symbology = symbologies[k]!=-1 ? results.symbologies[symbologies[k]] : null;
                            var symbNode = {
                                name: layer.name+(symbology?'-'+symbology.name:''),
                                symbologyId: symbology ? symbology.symbologyName : '#blank#',
                                leaf: true,
                                at: layer._id,
                                topic: node.topic,
                                type: 'topiclayer',
                                checked: false
                            }
                            node.children.push(symbNode);
                        }
                    }
                    nodes.push(node);
                }
                obj.layerNodes = nodes;
                return asyncCallback(null,obj);
                
                
            })
            
        }],
        finish: ['layers','sql',function(asyncCallback,results) {
            res.data = {
                add: results.sql.add,
                auRefMap: results.layerRefs,
                remove: results.sql.remove,
                areas: results.sql.areas,
                layerRefMap: results.layers.layerRefMap,
                layerNodes: results.layers.layerNodes
            }
            return callback(null);
        }]
    }
    async.auto(opts)
}


function getAreas(params, req, res, callback) {
    if (!params['location'] || !params['areaTemplate'] || !params['dataset'] || !params['years']) {
        res.data = [];
        return callback(null);
    }
    var filter = params['filter'] ? JSON.parse(params['filter']) : null;
    var years = JSON.parse(params['years']);
    var location = parseInt(params['location']);
    async.auto({
        dataset: function(asyncCallback) {
            crud.read('dataset', {_id:parseInt(params['dataset'])}, function(err, resls) {
                    if (err)
                        return asyncCallback(err);
                    return asyncCallback(null,resls[0])
            })
                    
        },
        layerRef: ['dataset',function(asyncCallback, results) {
                var areaTemplate = params['areaTemplate'] ? parseInt(params['areaTemplate']) : null;
                var queriedAreaTemplate = null;
                var nextAreaTemplate = null;
                
                var featureLayers = results.dataset.featureLayers;
                for (var i=0;i<featureLayers.length;i++) {
                    var fl = featureLayers[i];
                    if (fl==areaTemplate) {
                        queriedAreaTemplate = featureLayers[i+1];
                        if (i<featureLayers.length-2) {
                            nextAreaTemplate = featureLayers[i+2];
                        }
                    }
                }
                
                var areaTemplates = nextAreaTemplate ? [queriedAreaTemplate, nextAreaTemplate] : [queriedAreaTemplate];
                crud.read('layerref', {areaTemplate: {$in: areaTemplates}, location: location, year: {$in: years}, isData: false}, function(err, resls) {
                    if (err)
                        return asyncCallback(err);
                    var hasNextMap = {};
                    var layerRefs = [];
                    console.log(resls);
                    
                    for (var i = 0; i < resls.length; i++) {
                        var result = resls[i];
                        if (!result.fidColumn) {
                            continue;
                        }
                        if (result.areaTemplate == queriedAreaTemplate) {
                            layerRefs.push(result);
                        }
                        if (result.areaTemplate == nextAreaTemplate) {
                            hasNextMap[result.year] = true;
                        }
                    }
                    layerRefs.hasNext = true;
                    for (var i=0;i<layerRefs.length;i++) {
                        var layerRef = layerRefs[i];
                        var layerRefHasNext = hasNextMap[layerRef.year];
                        if (!layerRefHasNext) {
                            layerRefs.hasNext = false;
                            break;
                        }
                    }

                    asyncCallback(null, layerRefs);
                });


            }],
        areas: ['layerRef', function(asyncCallback, results) {
                var layerRefs = results.layerRef;
                var leaf = (layerRefs.length && layerRefs.hasNext) ? 'FALSE' : 'TRUE';
                var layerRef = layerRefs[0];
                var at = (layerRef ? layerRef.areaTemplate : -1)
                var sql = 'SELECT a.gid, '+location+' AS loc,'+ leaf + ' AS leaf,' + at  + ' AS at,' + (layerRef ? layerRef._id : -1) + ' AS lr, a.name, ST_AsText(a.extent) as extent';
                // pro UP nutno upravit
                var layerId = layerRef ? layerRef['_id'] : 'user_' + req.userId + '_loc_' + location + '_y_' + years;

                sql += ' FROM views.layer_' + layerId+' a';
                for (var k = 1; k < layerRefs.length; k++) {
                        var altLayerRef = layerRefs[k];
                        sql += ' INNER JOIN views.layer_' + altLayerRef._id + ' l' + altLayerRef._id + ' ON a.gid=l' + altLayerRef._id + '.gid'
                    }
                sql += ' WHERE 1=1'
                if (layerRef && layerRef.parentColumn && params['gid']) {
                    sql += ' AND a.parentgid=$1';
                }
                if (filter && filter.areaTemplates[at]) {
                    sql += getFilterSql(filter.filters, 'a.');
                }
                sql += ' ORDER BY name';
                console.log(sql)
                var queryParams = (layerRef && layerRef.parentColumn && params['gid']) ? [parseInt(params['gid'])] : []
                var client = conn.getPgDb();
                console.log(sql);
                client.query(sql, queryParams, function(err, results) {

                    if (err)
                        return callback(err);
                    res.data = results.rows;
                    return callback(null);
                })

            }]
    })
}

var getFilterSql = function(atFilter, prefix) {
    var sql = '';
    for (var i = 0; i < atFilter.length; i++) {
        var attr = atFilter[i];
        var attrName = prefix + 'as_' + attr.as + '_attr_' + attr.attr;
        var normAttrName = null;
        if (attr.normType == 'area') {
            normAttrName = prefix+'area'
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
    getAreas: getAreas,
    getThemeYearConf: getThemeYearConf
}
