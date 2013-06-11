var crud = require('../rest/crud');
var async = require('async');
var us = require('underscore')

function getThemeLocationConf(params, req, res, callback) {
    if (!params['theme'] || !params['location']) {
        res.data = [];
        return callback();
    }
    async.auto({
        theme: function(asyncCallback) {
            crud.read('theme', {_id: parseInt(params['theme'])}, function(err, results) {
                if (err)
                    return asyncCallback(err);
                asyncCallback(null, results[0]);
            });
        },
        areaTemplates: ['theme', function(asyncCallback, results) {
                var areaTemplates = results.theme.areaTemplates || [];
                crud.read('areatemplate', {_id: {$in: areaTemplates}}, function(err, resls) {
                    if (err)
                        return asyncCallback(err);
                    asyncCallback(null, resls);
                });
            }],
        trees: ['theme', function(asyncCallback, results) {
                var trees = results.theme.trees || [];
                crud.read('tree', {_id: {$in: trees}}, function(err, resls) {
                    if (err)
                        return asyncCallback(err);
                    asyncCallback(null, resls);
                });
            }],
        layerRefMap: ['theme', 'trees', function(asyncCallback, results) {
                var location = parseInt(params['location'])
                var year = params['year'] ? parseInt(params['year']) : results.theme.defaultYear;
                var areaTemplates = results.theme.areaTemplates || [];
                areaTemplates = areaTemplates.concat([]);
                for (var i = 0; i < results.trees.length; i++) {
                    var tree = results.trees[i];
                    for (var j = 0; j < tree.featureLayerTemplates; j++) {
                        areaTemplates.push(tree.featureLayerTemplates[j]);
                    }
                }
                for (var i = 0; i < results.theme.layerMap.length; i++) {
                    var layer = results.theme.layerMap[i];
                    areaTemplates.push(layer.areaTemplate);
                }
                crud.read('layerref', {areaTemplate: {$in: areaTemplates}, location: location, year: year, isData: false}, function(err, resls) {
                    if (err)
                        return asyncCallback(err);
                    var layerRefMap = {};
                    for (var i = 0; i < resls.length; i++) {
                        var result = resls[i];
                        result.id = result['_id'];
                        layerRefMap[result.areaTemplate] = result;
                    }
                    asyncCallback(null, layerRefMap);
                });
            }]
                ,
        symbologyMap: ['theme', function(asyncCallback, results) {
                var layerMap = results.theme.layerMap;
                var symbologies = [];
                for (var i = 0; i < layerMap.length; i++) {
                    symbologies = us.union(symbologies, layerMap[i].symbologies)
                }
                crud.read('symbology', {_id: {$in: symbologies}}, function(err, resls) {
                    if (err)
                        callback(err);
                    var symbMap = {};
                    for (var i = 0; i < resls.length; i++) {
                        var symb = resls[i];
                        symbMap[symb._id] = symb;
                    }
                    asyncCallback(null, symbMap)
                })
            }],
        userPolygons: function(asyncCallback) {
            if (!req.userId) {
                return asyncCallback(null)
            }
            crud.read('userpolygon', {$and: [{location: parseInt(params['location'])}, {user: req.userId}]}, function(err, resls) {
                console.log(resls)
                if (err)
                    return callback(err);
                return asyncCallback(null, resls[0]);
            })
        },
        res: ['theme', 'trees', 'areaTemplates', 'layerRefMap', 'symbologyMap', 'userPolygons', function(asyncCallback, results) {
                var layerRefMap = results.layerRefMap;
                var location = parseInt(params['location'])
                var layerTypeMap = {};
                var year = params['year'] ? parseInt(params['year']) : results.theme.defaultYear;
                var result = [{
                        name: 'Base',
                        groupName: 'base',
                        expanded: true,
                        allowDrag: false,
                        allowDrop: false,
                        allowOnlyOne: true,
                        children: [{
                                name: 'Hybrid',
                                allowDrag: false,
                                layerName: 'hybrid',
                                initialized: true,
                                checked: true,
                                leaf: true
                            }, {
                                name: 'Street',
                                allowDrag: false,
                                initialized: true,
                                layerName: 'roadmap',
                                checked: false,
                                leaf: true
                            }, {
                                name: 'Terrain',
                                allowDrag: false,
                                initialized: true,
                                layerName: 'terrain',
                                checked: false,
                                leaf: true
                            }]
                    }];
                
                var userPolygons = results.userPolygons
                if (!results.theme.analysis || !results.theme.analysis.length) {
                    userPolygons = null;
                }
                var lastBindAt = 0;
                for (var i = 0; i < results.theme.layerMap.length; i++) {
                    var layer = results.theme.layerMap[i];
                    if (layer.bindAt) {
                        lastBindAt = i+1;
                    }
                }
                if (userPolygons && userPolygons.viewsCreated.length) {
                    results.theme.layerMap.splice(lastBindAt,0,{
                        bindAt: -1,
                        areaTemplate: -1,
                        symbologies: [],
                        initialized: true
                    })
                }
                for (var i = 0; i < results.theme.layerMap.length; i++) {
                    var layer = results.theme.layerMap[i];
                    var layerRef = layerRefMap[layer.areaTemplate];

                    var type = layer.layerType || 'Thematic';
                    var symbologies = layer.symbologies;
                    var existingType = null;
                    if (layerTypeMap[type]) {
                        existingType = layerTypeMap[type]
                    }
                    else {
                        existingType = {
                            name: type.slice(0, 1).toUpperCase() + type.slice(1),
                            groupName: type,
                            expanded: true,
                            children: []
                        }
                        result.push(existingType);
                        layerTypeMap[type] = existingType;
                    }
                    var layerName = layerRef ? (layerRef.layer || layerRef.wmsLayers) : '$blank$';
                    layerName = (layer.areaTemplate==-1 && userPolygons && userPolygons.viewsCreated.length) ? '#userpolygon#layer_user_'+req.userId+'_loc_'+location+'_y_'+userPolygons.viewsCreated[0] : layerName
                    var obj = {
                        name: layer.areaTemplate == -1 ? 'User polygons' : layer.name,
                        allowDrop: false,
                        allowOnlyOne: true,
                        layerName: layerName,
                        initialized: layerRef != null || layer.areaTemplate==-1,
                        bindAt: layer.bindAt,
                        at: layer.areaTemplate,
                        checked: layer.defVisible ? true : false,
                        children: []
                    }
                    if (layerRef && layerRef.wmsAddress) {
                        obj.wmsAddress = layerRef.wmsAddress
                    }
                    if (layer.bindAt) {
                        lastBindAt = i+1;
                    }
                    for (var j = 0; j < symbologies.length; j++) {
                        var symbologyId = symbologies[j]
                        var symbology = results.symbologyMap[symbologyId]
                        var symbObj = {
                            name: symbology.name,
                            allowDrag: false,
                            checked: j == 0,
                            leaf: true,
                            symbologyId: symbology.symbologyName
                        }
                        obj.children.push(symbObj);
                    }
                    var symbObj = {
                        name: 'Default',
                        allowDrag: false,
                        checked: !symbologies.length,
                        leaf: true,
                        symbologyId: '$blank$'
                    }
                    obj.children.push(symbObj);

                    obj.symbology = obj.children[0].symbologyId
                    existingType.children.push(obj);

                }
                
                result.push({
                    name: 'System',
                    groupName: 'areaoutline',
                    allowDrop: false,
                    children: [{
                            name: 'Area outline',
                            allowDrag: false,
                            allowDrop: false,
                            layerName: 'areaoutline',
                            checked: true,
                            initialized: false,
                            leaf: true
                        }, {
                            name: 'User polygon',
                            allowDrag: false,
                            allowDrop: false,
                            layerName: 'userpolygon',
                            checked: false,
                            initialized: true,
                            leaf: true
                        }]
                })
                var areaTrees = [];
                for (var i = 0; i < results.areaTemplates.length; i++) {
                    var areaTemplate = results.areaTemplates[i];

                    if (layerRefMap[areaTemplate._id]) {
                        areaTrees.push({
                            objId: areaTemplate._id,
                            text: areaTemplate.name,
                            isTree: false
                        })
                    }
                }

                for (var i = 0; i < results.trees.length; i++) {
                    var tree = results.trees[i];

                    if (layerRefMap[tree.featureLayerTemplates[0]]) {
                        areaTrees.push({
                            objId: tree._id,
                            text: tree.name,
                            isTree: true
                        })
                    }
                }
                if (userPolygons && userPolygons.viewsCreated) {
                    areaTrees.push({
                        objId: -1,
                        text: 'User polygons',
                        isTree: false
                    })
                    
                }

                res.data = {layers: result, areaTrees: areaTrees, areaTemplateMap: results.layerRefMap, userPolygons: results.userPolygons};
                return callback();
            }]
    }, function(err) {
        if (err)
            return callback(err);
    });

}

module.exports = {
    getThemeLocationConf: getThemeLocationConf
}
