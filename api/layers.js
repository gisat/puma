
var http = require('http');
var querystring = require('querystring');
var conn = require('../common/conn');
var crud = require('../rest/crud');
var dom = require('../common/dom');
var async = require('async');
var OpenLayers = require('openlayers').OpenLayers;

var us = require('underscore')



function gatherLayerData(featureInfo, callback) {
    var confs = [];
    var features = JSON.parse(featureInfo).features;
    for (var i = 0; i < features.length; i++) {
        var feature = features[i];
        var gid = feature.properties.gid;
        var layerName = feature.id.split('.')[0];
        confs.push({layerName: layerName, gid: gid})
    }

    var opts = {
        data: function(asyncCallback) {
            async.map(confs, function(item, eachCallback) {
                var sql = 'SELECT * FROM views.' + item.layerName + ' WHERE gid=' + item.gid;
                console.log(sql)
                var client = conn.getPgDb();
                client.query(sql, [], function(err, resls) {
                    if (err)
                        return callback(err);
                    var row = resls.rows[0];
                    if (!row) {
                        return eachCallback(null, {row: null, attrs: [], attrSets: []})
                    }
                    var attrs = [];
                    var attrSets = [];
                    var dataMap = {};
                    for (var key in row) {
                        if (key.indexOf('attr') < 0) {
                            continue;
                        }
                        var splitted = key.split('_');
                        attrSets.push(parseInt(splitted[1]));
                        attrs.push(parseInt(splitted[3]));
                    }
                    attrSets = us.uniq(attrSets);
                    attrs = us.uniq(attrs);
                    eachCallback(null, {row: row, attrs: attrs, attrSets: attrSets});
                })
            }, function(err, items) {
                var rows = [];
                var attrSets = [];
                var attrs = [];
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    attrSets = us.union(attrSets, item.attrSets)
                    attrs = us.union(attrs, item.attrs);
                    rows.push(item.row);
                }
                return asyncCallback(null, {rows: rows, attrSets: attrSets, attrs: attrs})
            })
        },
        attrSets: ['data',function(asyncCallback, results) {
            crud.read('attributeset', {_id: {$in: results.data.attrSets}}, function(err, resls) {
                if (err)
                    callback(err);
                var attrSetMap = {};
                for (var i = 0; i < resls.length; i++) {
                    var attrSet = resls[i];
                    attrSetMap[attrSet._id] = attrSet;
                }
                asyncCallback(null, attrSetMap)
            })
        }],
        attrs: ['data',function(asyncCallback, results) {
            crud.read('attribute', {_id: {$in: results.data.attrs}}, function(err, resls) {
                if (err)
                    callback(err);
                var attrMap = {};
                for (var i = 0; i < resls.length; i++) {
                    var attr = resls[i];
                    attrMap[attr._id] = attr;
                }
                asyncCallback(null, attrMap)
            })
        }],
        result: ['attrs','attrSets','data',function(asyncCallback, results) {
            var rows = results.data.rows;
            var data = [];
            console.log(results.data)
            for (var i=0;i<rows.length;i++) {
                var row = rows[i];
                var rowParent = {
                    attrSet: -1,
                    expanded: true,
                    name: row.name,
                    children: []
                }
                var attrSetNode = null;
                for (var key in row) {
                    if (key.indexOf('attr') < 0) {
                        continue;
                    }
                    var splitted = key.split('_');
                    var attrSet = splitted[1];
                    var attr = splitted[3];
                    if (!attrSetNode || attrSetNode.attrSet != attrSet) {
                        attrSetNode = {
                            attrSet: attrSet,
                            expanded: true,
                            name: results.attrSets[attrSet].name,
                            children: []
                        }
                        rowParent.children.push(attrSetNode)
                    }
                    var attrNode = {
                        attrSet: attrSet,
                        name: results.attrs[attr].name,
                        value: row[key],
                        leaf: true
                    }
                    attrSetNode.children.push(attrNode)
                }
                data.push(rowParent)
            }
            return callback(null,data);
        }],
    }
    async.auto(opts)

}



function getLayers(params, req, res, callback) {

    var headers = {
        'Cookie': 'sessionid=' + (req.ssid || '')
    };

    var options = {
        host: '192.168.2.8',
        path: '/data/acls',
        headers: headers,
        method: 'GET'
    };

    conn.request(options, null, function(err, output, resl) {
        if (err)
            return callback(err);
        var layers = JSON.parse(output).rw;
        var layerMap = {};
        for (var i = 0; i < layers.length; i++) {
            layerMap[layers[i]] = false;
        }

        crud.read('layerref', {layer: {$in: layers}}, function(err, result) {
            if (err)
                return callback(err);

            for (var i = 0; i < result.length; i++) {
                layerMap[result[i].layer] = true;
            }
            var objs = [];
            for (layer in layerMap) {
                var obj = {
                    name: layer,
                    referenced: layerMap[layer]
                }
                objs.push(obj);
            }
            objs.push({name: 'WMS', referenced: false, isWms: true})
            res.data = objs;
            return callback();
        })

    })
}



function activateLayerRef(params, req, res, callback) {
    var opts = {
        'layerRef': function(asyncCallback) {
            if (params['obj']) {
                return asyncCallback(null, params['obj']);
            }
            crud.read('layerref', {_id: parseInt(params['id'])}, function(err, results) {
                if (err)
                    return callback(err);
                var layerRef = results[0]
                layerRef.active = true;
                var id = layerRef._id;
                crud.update('layerref', layerRef, {userId: req.userId}, function(err) {
                    if (err)
                        return callback(err);
                    layerRef._id = id;
                    asyncCallback(null, layerRef);
                })
            })
        },
        'identicalLayerRef': ['layerRef', function(asyncCallback, results) {
                var layerRef = results.layerRef;
                var filter = {$and: [
                        {location: layerRef.location},
                        {year: layerRef.year},
                        {areaTemplate: layerRef.areaTemplate},
                        {isData: layerRef.isData},
                    ]}
                if (layerRef.attributeSet) {
                    filter.attributeSet = layerRef.attributeSet
                }
                crud.read('layerref', filter, function(err, resls) {
                    if (err)
                        return callback(err);
                    asyncCallback(null, resls)
                })
            }],
        'finish': ['identicalLayerRef', 'layerRef', function(asyncCallback, results) {
                var activated = false;
                async.forEachSeries(results.identicalLayerRef, function(item, eachCallback) {
                    if (item._id == results.layerRef._id) {
                        return eachCallback(null)
                    }
                    if (params.activateAnother && !activated) {
                        item.active = true;
                        activated = true;
                    }
                    else {
                        item.active = false;
                    }

                    crud.update('layerref', item, {userId: req.userId}, function(err) {
                        if (err)
                            return callback(err);
                        eachCallback(null)
                    })
                }, function() {
                    if (params.justPerform) {

                        return callback(null);
                    }
                    return getLayerRefTable(params, req, res, callback);
                })
            }]

    }
    async.auto(opts);
}


function getLayerDetails(params, req, res, callback) {

    var postData = {
        SERVICE: 'wfs',
        REQUEST: 'DescribeFeatureType',
        TYPENAME: params.layer
    };
    postData = querystring.stringify(postData);
    var options = {
        host: '192.168.2.8',
        path: '/geoserver/geonode/ows?' + postData,
        method: 'GET'
                ,
        headers: {
            'Cookie': 'ssid=' + req.cookies['ssid']
        }
    };
    conn.request(options, null, function(err, output, resl) {
        if (err)
            return callback(err);
        dom.execInDom(function() {
            var format = new OpenLayers.Format.WFSDescribeFeatureType();
            var data = format.read(output);
            if (!data.featureTypes) {
                return callback(new Error('nofeaturetype'))
            }
            res.data = data;
            return callback();
        })

    })
}

function getLayerRefTable(params, req, res, callback) {
    var toRows = params['toRows'];
    var filter = {
        attributeSet: params['attributeSets'] ? JSON.parse(params['attributeSets']) : null,
        location: JSON.parse(params['locations']),
        areaTemplate: JSON.parse(params['layerTemplates']),
        year: JSON.parse(params['years'])
    }

    var asFilter = filter.attributeSet ? {$in: filter.attributeSet} : {isData: false};
    var query = {
        $and: [
            {$or: [{attributeSet: asFilter}, {isData: false}]},
            {location: {$in: filter.location}},
            {areaTemplate: {$in: filter.areaTemplate}},
            {year: {$in: filter.year}}
        ]
    }

    if (!filter.attributeSet) {
        filter.attributeSet = ['blank']
    }


    var opts = {
        layerRefs: function(asyncCallback) {
            crud.read('layerref', query, function(err, results) {
                if (err)
                    return callback(err);
                var layerRefMap = {};
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];
                    var loc = result.location;
                    var as = result.attributeSet || 'blank';
                    var at = result.areaTemplate;
                    var year = result.year;
                    layerRefMap[loc] = layerRefMap[loc] || {}
                    layerRefMap[loc][year] = layerRefMap[loc][year] || {}
                    layerRefMap[loc][year][at] = layerRefMap[loc][year][at] || {};
                    layerRefMap[loc][year][at][as] = layerRefMap[loc][year][at][as] || [];
                    layerRefMap[loc][year][at][as].push(result)
                }
                asyncCallback(null, layerRefMap);
            });
        },
        baseLayerRefs: function(asyncCallback) {
            if (!params['attributeSet']) {
                return asyncCallback(null, null);
            }

        },
        rowNameMap: function(asyncCallback) {
            crud.read(toRows.toLowerCase(), {_id: {$in: filter[toRows]}}, function(err, results) {
                if (err)
                    return callback(err);
                var nameMap = {};
                for (var i = 0; i < results.length; i++) {
                    var result = results[i]
                    nameMap[result['_id']] = result['name'];
                }
                asyncCallback(null, nameMap);
            });
        },
        result: ['layerRefs', 'rowNameMap', function(asyncCallback, results) {
                var layerRefMap = results.layerRefs;
                var rowNameMap = results.rowNameMap;
                var objs = ['location', 'areaTemplate', 'year', 'attributeSet'];
                var objIndex = objs.indexOf(toRows);
                objs.splice(objIndex, 1);
                objs.push(toRows);
                var objMap = {};
                var rows = [];
                for (var i0 = 0; i0 < filter[objs[0]].length; i0++) {
                    objMap[objs[0]] = filter[objs[0]][i0];
                    for (var i1 = 0; i1 < filter[objs[1]].length; i1++) {
                        objMap[objs[1]] = filter[objs[1]][i1];
                        for (var i2 = 0; i2 < filter[objs[2]].length; i2++) {
                            objMap[objs[2]] = filter[objs[2]][i2];
                            var value = ''
                            for (var i3 = 0; i3 < filter[objs[3]].length; i3++) {
                                objMap[objs[3]] = filter[objs[3]][i3];
                                var id = filter[objs[3]][i3];
                                var layerRefs = [];
                                try {
                                    layerRefs = layerRefMap[objMap.location][objMap.year][objMap.areaTemplate][objMap.attributeSet]
                                }
                                catch (e) {

                                }
                                if (!layerRefs) {
                                    layerRefs = [];
                                }
                                for (var i = 0; i < layerRefs.length; i++) {
                                    var layerRef = layerRefs[i];
                                    cls = 'ref';
                                    if (layerRef.analysis) {
                                        cls += ' refanalysis';
                                    }
                                    if (layerRef.active === false) {
                                        cls += ' refnoactive';
                                    }
                                    if (layerRef.available === false) {
                                        cls += ' refnoavailable';
                                    }
                                    value += '<a href="blank" layerref="' + layerRefs[i]['_id'] + '" objid="' + id + '" class="' + cls + '">' + rowNameMap[id] + '</a> '
                                }
                                if (!layerRefs.length) {

                                    var cls = 'noref';
                                    if (objMap.attributeSet != 'blank') {
                                        try {
                                            layerRefs = layerRefMap[objMap.location][objMap.year][objMap.areaTemplate]['blank']
                                        }
                                        catch (e) {
                                        }
                                        if (!layerRefs || !layerRefs.length) {
                                            cls = 'cannotref'
                                        }
                                    }
                                    value += '<a href="blank" objid="' + id + '" class="' + cls + '">' + rowNameMap[id] + '</a> '
                                }
                            }
                            var row = {
                                attributeSet: objMap['attributeSet'],
                                location: objMap['location'],
                                year: objMap['year'],
                                areaTemplate: objMap['areaTemplate'],
                                value: value

                            }
                            row[toRows] = null;
                            rows.push(row)
                        }
                    }
                }
                res.data = rows;
                callback(null);
            }]
    }


    async.auto(opts);

}


function getAreas(params, req, res, callback) {
    if (!params['tree'] && !params['areaTemplate']) {
        res.data = [];
        return callback(null);
    }

    var year = parseInt(params['year'])
    var location = parseInt(params['location']);
    async.auto({
        tree: function(asyncCallback) {
            if (!params['tree'])
                return asyncCallback(null, null);
            crud.read('tree', {_id: parseInt(params['tree'])}, function(err, results) {
                if (err)
                    return asyncCallback(err);
                asyncCallback(null, results[0]);
            });

        },
//        theme: function(asyncCallback) {
//            crud.read('theme', {_id: parseInt(params['theme'])}, function(err, results) {
//                    if (err)
//                        return asyncCallback(err);
//                    asyncCallback(null, results[0]);
//                });
//            
//        },
        layerRef: ['tree', function(asyncCallback, results) {
                var areaTemplate = params['areaTemplate'] ? parseInt(params['areaTemplate']) : null;
                var queriedAreaTemplate = null;
                var nextAreaTemplate = null;
                if (areaTemplate == -1) {
                    return asyncCallback(null);
                }
                if (results.tree) {
                    var treeAreaTemplates = results.tree.featureLayerTemplates
                    var atIndex = 0;
                    if (areaTemplate) {
                        atIndex = treeAreaTemplates.indexOf(areaTemplate);
                        atIndex++;
                        queriedAreaTemplate = treeAreaTemplates[atIndex]
                    }
                    else {
                        queriedAreaTemplate = treeAreaTemplates[0]
                    }

                    nextAreaTemplate = treeAreaTemplates[atIndex + 1];
                }
                else {
                    queriedAreaTemplate = areaTemplate;

                }
                var areaTemplates = nextAreaTemplate ? [queriedAreaTemplate, nextAreaTemplate] : [queriedAreaTemplate];
                crud.read('layerref', {areaTemplate: {$in: areaTemplates}, location: location, year: year, isData: false}, function(err, results) {
                    if (err)
                        return asyncCallback(err);
                    var hasNext = false;
                    var layerRef = null;
                    for (var i = 0; i < results.length; i++) {
                        var result = results[i];
                        if (!result.fidColumn) {
                            continue;
                        }
                        if (result.areaTemplate == queriedAreaTemplate) {
                            layerRef = result;
                        }
                        if (result.areaTemplate == nextAreaTemplate) {
                            hasNext = true;
                        }
                    }
                    layerRef.hasNext = hasNext;

                    asyncCallback(null, layerRef);
                });


            }],
        areas: ['layerRef', function(asyncCallback, results) {
                var layerRef = results.layerRef;
                var leaf = (layerRef && layerRef.hasNext) ? 'FALSE' : 'TRUE';
                var sql = 'SELECT gid, ' + leaf + ' AS leaf,' + (layerRef ? layerRef.areaTemplate : -1) + ' AS at,' + (layerRef ? layerRef._id : -1) + ' AS lr, name, ST_AsText(extent) as extent';

                var layerId = layerRef ? layerRef['_id'] : 'user_' + req.userId + '_loc_' + location + '_y_' + year;

                sql += ' FROM views.layer_' + layerId;
                if (layerRef && layerRef.parentColumn && params['gid']) {
                    sql += ' WHERE parentgid=$1';
                }
                sql += ' ORDER BY name';

                var queryParams = (layerRef && layerRef.parentColumn && params['gid']) ? [parseInt(params['gid'])] : []
                var client = conn.getPgDb();
                client.query(sql, queryParams, function(err, results) {

                    if (err)
                        return callback(err);
                    res.data = results.rows;
                    return callback(null);
                })

            }]
    })
}


function getSymbologiesFromServer(params, req, res, callback) {
    var opts = {
        symbologiesServer: function(asyncCallback) {
            var username = 'gnode';
            var password = 'geonode';
            var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
            var headers = {
                'Content-type': 'application/json',
                'Authorization': auth
            };

            var path = '/geoserver/rest/styles.json'
            var options = {
                host: '192.168.2.8',
                path: path,
                headers: headers,
                port: 8080,
                method: 'GET'
            };
            conn.request(options, null, function(err, output, resl) {
                if (err)
                    return callback(err);
                var styles = JSON.parse(output).styles.style;
                console.log(styles)
                var names = [];
                for (var i = 0; i < styles.length; i++) {
                    names.push(styles[i].name)
                }
                asyncCallback(null, names)
            })
        },
        symbologiesDb: function(asyncCallback) {
            crud.read('symbology', {}, function(err, resls) {
                if (err)
                    return callback(err);
                var symbologies = [];
                for (var i = 0; i < resls.length; i++) {
                    symbologies.push(resls[i].symbologyName);
                }
                asyncCallback(null, symbologies)
            })
        },
        create: ['symbologiesServer', 'symbologiesDb', function(asyncCallback, results) {
                var symbologiesDb = symbologiesDb;
                var symbToCreate = us.difference(results.symbologiesServer, results.symbologiesDb)
                async.forEach(symbToCreate, function(symb, eachCallback) {
                    var obj = {
                        name: symb,
                        symbologyName: symb
                    }
                    crud.create('symbology', obj, {userId: req.userId}, function(err) {
                        if (err)
                            callback(err);
                        eachCallback(null);
                    })

                }, function() {
                    asyncCallback(null)
                })
            }],
        delete: ['symbologiesServer', 'symbologiesDb', 'create', function(asyncCallback, results) {
                var symbToDel = us.difference(results.symbologiesDb, results.symbologiesServer)
                async.forEach(symbToDel, function(symb, eachCallback) {
                    var obj = {
                        symbologyName: symb
                    }
                    crud.read('symbology', obj, function(err, resls) {
                        async.forEach(resls, function(resl, eachCallback2) {
                            crud.remove('symbology', {_id: resl._id}, function(err) {
                                // if cannot remove continue
                                eachCallback2(null);
                            })
                        }, function() {
                            eachCallback(null);
                        })
                    })

                }, function() {
                    callback(null)
                })
            }]
    }
    async.auto(opts);

}



module.exports = {
    getLayers: getLayers,
    getAreas: getAreas,
    getLayerRefTable: getLayerRefTable,
    getLayerDetails: getLayerDetails,
    getSymbologiesFromServer: getSymbologiesFromServer,
    activateLayerRef: activateLayerRef,
    gatherLayerData: gatherLayerData
}
