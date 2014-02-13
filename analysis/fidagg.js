var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var pg = require('pg');

function check(analysisObj, performedAnalysisObj, callback) {

    var location = performedAnalysisObj.location;
    var year = performedAnalysisObj.year;
    var featureLayerTemplate = performedAnalysisObj.featureLayerTemplates[0];
    var attrSets = getAttrSets(analysisObj);
    


    var layerRefMap = {};

    var opts = {
        'dataset': function(asyncCallback) {
            
            crud.read('dataset', {_id: performedAnalysisObj.dataset}, function(err, resls) {
                if (err)
                    return callback(err);
                return asyncCallback(null, resls[0])
            })
        },
        'layerRefFl': ['dataset',function(asyncCallback, results) {
            var flTemplates = results.dataset.featureLayers;
            var flIndex = flTemplates.indexOf(featureLayerTemplate);
            flTemplates = flTemplates.slice(0, flIndex + 1);
            async.map(flTemplates, function(flTemplate, mapCallback) {
                crud.read('layerref', {areaTemplate: flTemplate, location: location, year: year, isData: false}, function(err, resls) {
                    if (err)
                        return callback(err);
                    if (!resls.length) {
                        
                        return callback(new Error('missinglayerrefbase'))
                    }
                    if (flTemplates.indexOf(flTemplate)!=0 && !resls[0].parentColumn) {
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
            })
        }],
        'layerRefAs': ['layerRefFl', function(asyncCallback, results) {
                async.map(attrSets, function(attrSet, mapCallback) {
                    crud.read('layerref', {areaTemplate: featureLayerTemplate, location: location, year: year, attributeSet: attrSet}, function(err, resls) {
                        if (err)
                            return callback(err);
                        if (!resls.length) {
                            return callback(new Error('missinglayerrefattrset'))
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
    var client = new pg.Client(conn.getConnString());
    client.connect();


    var location = performedAnalysisObj.location;
    var year = performedAnalysisObj.year;
    var featureLayerTemplate = performedAnalysisObj.featureLayerTemplates[0];
    var opts = {
        'dataset': function(asyncCallback) {
            crud.read('dataset', {_id: performedAnalysisObj.dataset}, function(err, resls) {
                if (err)
                    return callback(err);
                return asyncCallback(null, resls[0])
            })
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
                            text = 'AVG(&ATTR& * &AREA&) / SUM(&AREA&)';
                            break;
                        case 'avgattr':
                            text = 'AVG(&ATTR& * &ATTR2&) / SUM(&ATTR2&)';
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
                    })
                    addedAttrs.push(obj);
                }

                select += ' FROM views.layer_$LAYERREF$ a GROUP BY a.parentgid';

                var sql = 'CREATE TABLE analysis.an_' + performedAnalysisObj['_id'] + '_$INDEX$ AS (';
                sql += select;
                sql += ')';
                flTemplates.reverse();
                var flTemplatesIterate = flTemplates.slice(0,flTemplates.length-1);
                async.forEachSeries(flTemplatesIterate, function(item, asyncCallback) {
                    var layerRef = layerRefMap[item]['_id']
                    var i = flTemplatesIterate.indexOf(item);
                    var nextFl = flTemplates[i+1];
                    var currentSql = sql.replace('$INDEX$', nextFl);
                    currentSql = currentSql.replace('$LAYERREF$', layerRef);
                    client.query(currentSql, function(err, results) {
                        if (err)
                            return callback(err);
                        async.forEach(analysisObj.attributeSets, function(attrSet, eachCallback) {
                            console.log('AS '+attrSet)
                            crud.create('layerref', {
                                location: location,
                                year: year,
                                areaTemplate: nextFl,
                                isData: true,
                                fidColumn: 'gid',
                                attributeSet: attrSet,
                                columnMap: columnMap[attrSet].slice(0),
                                layer: 'analysis:an_' + performedAnalysisObj['_id'] + '_' + nextFl,
                                analysis: performedAnalysisObj['_id']
                            }, {userId:req.userId},function(err, res) {
                                if (err) {
                                    return callback(err);
                                }
                                return eachCallback(null);
                            })
                        }, function(err) {
                            if (err) {
                                return callback(err);
                            }
                            console.log('over')
                            return asyncCallback(null);
                        })
                    })
                }, function(err, resls) {
                    
                    client.end();
                    if (performedAnalysisObj.ghost) {
                        return callback(null);
                    }
                    performedAnalysisObj.finished = new Date();
                    crud.update('performedanalysis', performedAnalysisObj, {userId: req.userId,isAdmin:true}, function(err) {
                        console.log('cb');
                        return callback(err);
                    });
                })
            }]
    }

    async.auto(opts)
}

var getAttrSets = function(analysisObj) {
    var attrSets = [];
    for (var i = 0; i < analysisObj.attributeMap.length; i++) {
        var attrRec = analysisObj.attributeMap[i];
        if (attrRec.normAttributeSet && attrSets.indexOf(attrRec.normAttributeSet)<0) {
            attrSets.push(attrRec.normAttributeSet)
        }
        if (attrRec.attributeSet && attrSets.indexOf(attrRec.attributeSet)<0) {
            attrSets.push(attrRec.attributeSet)
        }
    }
    return attrSets;
}
module.exports = {
    check: check,
    perform: perform
}