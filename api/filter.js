
var conn = require('../common/conn');
var data = require('../data/data');
var async = require('async')
var crud = require('../rest/crud');
var us = require('underscore')





function filter(params, req, res, callback) {

    
//    var params2 = us.clone(params);

    params.filter = null;
//    params2.bypassLeafs = true;
//    params2.refreshAreas = true;
//    params2.allAreaTemplates = true;
//    params2.justAreas = true;

//    if (params['expanded']) {
//        require('./theme').getThemeYearConf(params2,req,res,function() {
//            var newData = [];
//            for (var i=0;i<res.data.length;i++) {
//                var row = res.data[i];
//                var obj = {
//                    loc: row.loc,
//                    at: row.at,
//                    gid: row.gid
//                }
//                newData.push(obj);
//                
//            }
//            res.data = newData;
//            callback(null)
//        });
//        return;
//    }


    var opts = {
        attrConf: function(asyncCallback) {
            if (!params['areas']) {
                return asyncCallback(null);
            }
            data.getAttrConf(params, function(err, attrConf) {
                if (err)
                    return callback(err);

                return asyncCallback(null, attrConf);
            })
        },
        data: ['attrConf', function(asyncCallback, results) {
                if (!results.attrConf) {

                    return callback(null);
                }
                if (!params['requireData']) {
                    return asyncCallback();
                }
                params.attrMap = results.attrConf.prevAttrMap;
                var filters = JSON.parse(params['filters'])
                var filterParam = [];
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (filter.inactive) continue;
                    var obj1 = {
                        field: 'as_' + filter.as + '_attr_' + filter.attr,
                        comparison: 'gt',
                        value: filter.min
                    }
                    var obj2 = {
                        field: 'as_' + filter.as + '_attr_' + filter.attr,
                        comparison: 'lt',
                        value: filter.max
                    }
                    filterParam.push(obj1);
                    filterParam.push(obj2);
                }
                
                params['filter'] = JSON.stringify(filterParam);
                data.getData(params, function(err, dataObj) {
                    var newData = [];
                    if (err) {
                        res.data = [];
                        return callback(null);
                    }
                    for (var i = 0; i < dataObj.data.length; i++) {
                        var row = dataObj.data[i];
                        var obj = {
                            loc: row.loc,
                            at: row.at,
                            gid: row.gid
                        }
                        newData.push(obj);
                    }
                    return asyncCallback(null,newData)
                })
            }],
        dist: ['attrConf','metaData', function(asyncCallback,results) {
                params.attrMap = results.attrConf.prevAttrMap;
                var attrMetaMap = {};
                var attrs = JSON.parse(params['attrs']);
                async.map(attrs, function(attr, mapCallback) {
                    var newParams = us.clone(params);
                    //newParams.attrs = JSON.stringify([attr]);
                    newParams.sort = JSON.stringify([{property: 'as_' + attr.as + '_attr_' + attr.attr, direction: 'ASC'}])
                    newParams.sortNorm = JSON.stringify({
                        normType: attr.normType,
                        normAttr: attr.normAttr,
                        normAs: attr.normAs
                    })
                    var filters = JSON.parse(params['filters'])
                    var filterParam = [];
                    
                    for (var i = 0; i < filters.length; i++) {
                        var filter = filters[i];
                        if (filter.as==attr.as && filter.attr==attr.attr) {
                            continue;
                        }
                        if (filter.inactive) continue;
                        var attrName = 'as_'+filter.as+'_attr_'+filter.attr;
                        console.log(filter);
                        if (filter.maxOrig>results.metaData[attrName].max || filter.minOrig<results.metaData[attrName].min) {
                            filter.min = results.metaData[attrName].min-0.1;
                            filter.max = results.metaData[attrName].max+0.1;
                        }
                        var obj1 = {
                            field: attrName,
                            comparison: 'gt',
                            value: filter.min
                        }
                        var obj2 = {
                            field: attrName,
                            comparison: 'lt',
                            value: filter.max
                        }
                        filterParam.push(obj1);
                        filterParam.push(obj2);
                    }
                    console.log(filterParam)
                    newParams.filter = JSON.stringify(filterParam);
                    data.getData(newParams, function(err, dataObj) {
                        if (err)
                            return callback(err)
                        dataObj.units = results.attrConf.attrMap[attr.as][attr.attr].units
                        //dataObj.units = results.attrConf.attrMap[attr.attr].units
                        return mapCallback(null, dataObj)
                    })

                }, function(err, resls) {
                    for (var i = 0; i < resls.length; i++) {
                        var resl = resls[i];

                        var attr = attrs[i];
                        var attrName = 'as_' + attr.as + '_attr_' + attr.attr;
                        var attrMeta = results.metaData[attrName]
                        var min = attrMeta['min'];
                        var max = attrMeta['max'];
                        var diff = max - min;
                        var classes = 20;
                        var fraction = diff != 0 ? diff / classes : 1;
                        var dist = [];
                        for (var j = 0; j < classes; j++) {
                            dist[j] = 0;
                        }
                        for (var j = 0; j < resl.data.length; j++) {
                            var row = resl.data[j];
                            var val = row[attrName];
                            var classNum = Math.floor((val - min) / fraction);
                            classNum = classNum == classes ? classNum - 1 : classNum;
                            dist[classNum]++;
                        }


                        attrMetaMap['as_' + attr.as + '_attr_' + attr.attr] = dist
                    }
                    return asyncCallback(null,attrMetaMap)

                })
            }],
        metaData: ['attrConf', function(asyncCallback, results) {
                if (!results.attrConf) {

                    return callback(null);
                }
                if (params['requireData']) {
                    //return asyncCallback(null);
                }
                
                params.attrMap = results.attrConf.prevAttrMap;
                var attrMetaMap = {};
                var newParams = us.clone(params);
                newParams.aggregate = 'min,max';
                data.getData(newParams, function(err, dataObj) {
                    if (err)
                        return callback(err)
                    var attrs = JSON.parse(params['attrs']);
                    var data = {};
                    for (var i=0;i<attrs.length;i++) {
                        var attr = attrs[i];
                        var min = dataObj.aggregate['min_as_'+attr.as+'_attr_'+attr.attr];
                        var max = dataObj.aggregate['max_as_'+attr.as+'_attr_'+attr.attr];
                        var attrName = 'as_' + attr.as + '_attr_' + attr.attr;
                        var diff = max - min;
                        for (var k = -3; k < 100; k++) {
                            var num = diff / Math.pow(10, k);
                            if (num < 400) {
                                break;
                            }
                        }
                        min = (Math.abs(min - Math.round(min)) < 0.001) ? Math.round(min) : min;
                        max = (Math.abs(max - Math.round(max)) < 0.001) ? Math.round(max) : max;
                        min = Math.floor(min * Math.pow(10, -k)) / Math.pow(10, -k)
                        max = Math.ceil(max * Math.pow(10, -k)) / Math.pow(10, -k)
                        min = k > 0 ? parseInt(min.toFixed(0)) : min;
                        max = k > 0 ? parseInt(max.toFixed(0)) : max;
                        data[attrName] = {
                            min: min,
                            max: max,
                            units: results.attrConf.attrMap[attr.as][attr.attr].units,
                            decimal: k
                        }
                    }
                    
                    //dataObj.units = results.attrConf.attrMap[attr.attr].units
                    return asyncCallback(null, data)
                })



            }],
        result: ['metaData','data','dist', function(asyncCallback, results) {
                 res.data = {
                     metaData: results.metaData,
                     data: results.data,
                     dist: results.dist
                 }
                 return callback();
            }]
    }


    async.auto(opts)


}

function getFilterConfig(params, req, res, callback) {
    var year = JSON.parse(params['years'])[0];
    var areas = JSON.parse(params['areas']);
    var attrs = JSON.parse(params['attrs']);
    var returnMeta = JSON.parse(params['returnMeta']);
    var returnData = JSON.parse(params['returnData'])


    
    
    
    var years = JSON.parse(params['years']);
    
    var opts = {
        locations: function(asyncCallback) {
            crud.read('location', {dataset: parseInt(params['dataset'])}, function(err, resls) {
                if (err)
                    return callback(err);
                var locs = [];
                for (var i=0;i<resls.length;i++) {
                    locs.push(resls[i]._id);
                }
                return asyncCallback(null,locs);
            })
        },
        data: ['locations',function(asyncCallback,resls) {
            var areas = {};
            for (var i=0;i<resls.locations.length;i++) {
                var loc = resls.locations[i];
                areas[loc] = {};
                for (var j=0;j<fl.length;j++) {
                    areas[loc][fl[j]] = true;
                }
            }   
            params['areas'] = JSON.stringify(areas);
            async.map(years,function(item,mapCallback) {
                var newParams = us.clone(params);
                newParams.aggregate = 'min,max';
                newParams.years = JSON.stringify([item]);
                
                var opts2 = {
                    attrConf: function(asyncCallback2) {
                        data.getAttrConf(newParams, function(err, attrConf) {
                            if (err)
                                return callback(err);

                            return asyncCallback2(null, attrConf);
                        })
                    },
                    res: ['attrConf', function(asyncCallback2, results) {
                            newParams.attrMap = results.attrConf.prevAttrMap;
                            data.getData(newParams, function(err, dataObj) {
                            if (err)
                                return callback(err)
                            dataObj.units = results.attrConf.attrMap.units
                            return mapCallback(null, dataObj)
                        })
                    }]
                }
                async.auto(opts2)
            },function(err,resls) {
                var attrMap = {};
                for (var i=0;i<attrs.length;i++) {
                    var attr = attrs[i];
                    var min = null;
                    var max = null;
                    for (var j=0;j<resls.length;j++) {
                        var resl = resls[j];
                        
                        if (!resl) continue;
                        var minVal = resl.aggregate['min_as_'+attr.as+'_attr_'+attr.attr];
                        var maxVal = resl.aggregate['max_as_'+attr.as+'_attr_'+attr.attr];
                        min = min==null ? minVal : Math.min(min,minVal);
                        max = max==null ? maxVal : Math.max(max,maxVal);
                    }
                    
                    var diff = max-min;
                    var inc = 1;
                    for (var x=1;x<10;x++) {
                        var deci = Math.pow(10,x);
                        
                        if (diff/deci>1 && diff/deci<=11) {
                            inc = deci/10;
                            break;
                        }
                    }
                    var multiplier = 1;
                    while (diff*multiplier<20) {
                        multiplier = multiplier * 10;
                    }
                    attrMap['as_'+attr.as+'_attr_'+attr.attr] = {min:Math.floor(min),max:Math.ceil(max),inc:inc,multiplier:multiplier,units:resl.units};
                }
                res.data = attrMap;
                return callback(null);
            })
            
            
        }]
    }
    async.auto(opts);
    
}
module.exports = {
    getFilterConfig: getFilterConfig,
    filter: filter
}