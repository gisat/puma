var dataMod = require('./dataspatial');
var async = require('async')
var crud = require('../rest/crud');
var conn = require('../common/conn')

function getChart(params, callback) {
    
    var selectedAreas = params['selectedAreas'] ? JSON.parse(params['selectedAreas']) : [];
    if (params['areas']) {
        selectedAreas.push(JSON.parse(params['areas']));
    }
    var years = JSON.parse(params['years']);
    var layer = params['featureLayer'] || params['outlineLayerTemplate'];
    var splitted = layer.split('_')[0];
    var layerTemplate = parseInt(splitted);
    var areaConfs = [];
    for (var i = 0; i < selectedAreas.length; i++) {
        var areas = selectedAreas[i];
        for (var loc in areas) {
            loc = parseInt(loc)
            for (var at in areas[loc]) {
                at = parseInt(at)
                if (!areas[loc][at].length)
                    continue;
                for (var j = 0; j < areas[loc][at].length; j++) {
                    var gid = areas[loc][at][j];
                    for (var k = 0; k < years.length; k++) {
                        var year = years[k];
                        areaConfs.push({loc: loc, at: at, gid: gid, year: year})
                    }
                }
            }
        }

    }
    if (!areaConfs.length) {
        return callback(new Error('No areas'));
    }
    if (areaConfs.length>4) {
        areaConfs = areaConfs.slice(0,4);
    }
    var opts = {
        layerRefs: function(asyncCallback) {
            async.map(areaConfs, function(item, eachCallback) {
                var query = {location: item.loc, year: item.year, isData: false, active: {$ne:false}, areaTemplate: {$in: [item.at, layerTemplate]}};
                crud.read('layerref', query, function(err, resls) {
                    if (err)
                            return callback(err);
                            
                    var layerRefs = [];
                    var areaRef = null;
                    for (var i = 0; i < resls.length; i++) {
                        var lr = resls[i];
                        if (lr.areaTemplate == item.at) {
                            areaRef = lr;
                        }
                        if (lr.areaTemplate == layerTemplate) {
                            layerRefs.push(lr);
                        }
                    }
                    if (!layerRefs.length || !areaRef) {
                        
                        return callback(new Error('Missing reference'));
                    }
                    return eachCallback(null, {layerRefs: layerRefs, areaRef: areaRef, item: item})
                })
            }, asyncCallback);
        },
        areas: ['layerRefs', function(asyncCallback, results) {
                //console.log('Lr '+results.layerRefs)
                async.map(results.layerRefs, function(item, eachCallback) {
                    var areaRef = item.areaRef;
                    var layerId = areaRef['_id'];
                    var sql = 'SELECT a.gid, a.name, ST_AsText(a.extent) as extent';
                    sql += ' FROM views.layer_' + layerId + ' a';
                    sql += ' WHERE a.gid = ' + item.item.gid;
                    sql += ' ORDER BY name';

                    var client = conn.getPgDb();
                    client.query(sql, {}, function(err, results) {

                        if (err)
                            return callback(err);
                        return eachCallback(null, results.rows);
                    })
                },function(err,resls) {
                    return callback(err,{rows:resls,layerRefs: results.layerRefs,opacity:params['featureLayerOpacity'] ? params['featureLayerOpacity']/100 : 0.7})
                })
            }]

    }

    async.auto(opts);

}
module.exports = {
    getChart: getChart
}




