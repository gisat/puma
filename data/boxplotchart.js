var dataMod = require('./data');
var async = require('async')
var crud = require('../rest/crud');

var us = require('underscore')

function getChart(params, callback) {
    var conf = cfg();
    conf = us.extend(conf,require('../data/defaultchart'))
    var attrs = JSON.parse(params['attrs']);
    var width = params['width'] || 560;
    var areas = JSON.parse(params['areas']);
    var oldAreas = params['areas']
    var years = JSON.parse(params['years']);
    
    
    return callback(null,conf)
    
    
    
    
    var opts = {
        
        data: ['attrConf',function(asyncCallback,results) {
                params.attrMap = results.attrConf.prevAttrMap;
                var stacking = params['stacking']
                var attrsNum = (!stacking || stacking == 'none' || stacking == 'double') ? attrs.length * years.length : years.length;
                dataMod.getData(params, function(err, dataObj) {
                    if (err)
                        return callback(err);
                    return asyncCallback(null, dataObj);
                })
            }],
        attrConf: function(asyncCallback) {

            dataMod.getAttrConf(params, function(err, attrConf) {
                if (err)
                    return callback(err);

                return asyncCallback(null, attrConf);
            })
        },
        years: function(asyncCallback) {
            crud.read('year', {}, function(err, resls) {
                if (err)
                    return callback(err);
                var map = {};
                for (var i=0;i<resls.length;i++) {
                    var resl = resls[i];
                    map[resl['_id']] = resl.name;
                }
                return asyncCallback(null,map)
            })
        },
        res: ['years','data', 'attrConf',  function(asyncCallback, results) {
                var data = results.data.data;
                

            }]
    }

    //async.auto(opts);

}

var cfg = function() {
    var conf = {
        chart: {
            type: 'boxplot'
        },
        legend: {
            enabled: false
        },
        xAxis: {
            categories: ['1', '2'],
        },
        yAxis: {
            title: {
                text: 'Y axis',
                style: {
                    color: '#222',
                    fontWeight: 'normal'
                },
                useHTML: true
            },
        },
        series: [{
                data: [
                    [760, 801, 848, 895, 965],
                    [733, 853, 939, 980, 1080]
                ]
            }]
    }
    return conf;
}

module.exports = {
    getChart: getChart
}


