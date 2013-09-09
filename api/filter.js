
var conn = require('../common/conn');
var data = require('../data/data');
var async = require('async')
var crud = require('../rest/crud');
var us = require('underscore')

function getFilterConfig(params,req,res,callback) {
    var attrs = JSON.parse(params['attrs']);
    var fl = JSON.parse(params['featureLayers']);
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
                    attrMap['as_'+attr.as+'_attr_'+attr.attr] = {min:Math.floor(min),max:Math.ceil(max),inc:inc};
                }
                res.data = attrMap;
                return callback(null);
            })
            
            
        }]
    }
    async.auto(opts);
    
}
module.exports = {
    getFilterConfig: getFilterConfig
}