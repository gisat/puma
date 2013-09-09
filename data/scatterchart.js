var dataMod = require('./data');
var async = require('async');

var crud = require('../rest/crud');
var us = require('underscore')
function getChart(params, callback) {
    
    var conf = cfg();
    conf = us.extend(conf,require('../data/defaultchart'))
    var attrs = JSON.parse(params['attrs']);
    var xAttr = attrs[0]
    var yAttr = attrs[1];
    var zAttr = attrs.length > 2 ? attrs[2] : null;
    var arr = zAttr ? [xAttr, yAttr,zAttr] : [xAttr, yAttr]
    params['attrs'] = JSON.stringify(arr);
    var years = JSON.parse(params['years'])
    var xAttrName = 'as_'+xAttr.as+'_attr_'+xAttr.attr;
    var yAttrName = 'as_'+yAttr.as+'_attr_'+yAttr.attr;
    var zAttrName = zAttr ? ('as_'+zAttr.as+'_attr_'+zAttr.attr):null;
    var invisibleYears = params['invisibleYears'] ? JSON.parse(params['invisibleYears']) : []
    var opts = {
        data: ['attrConf',function(asyncCallback,results) {
            params.attrMap = results.attrConf.prevAttrMap;
            dataMod.getData(params,function(err, dataObj) {
                if (err)
                    return callback(err);
                return asyncCallback(null,dataObj.data);
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
        res: ['data', 'attrConf','years', function(asyncCallback, results) {
                var newData = [];
                var data = results.data;
                var xName = null;
                var yName = null;
                var zName = null;
                for (var attrSetId in results.attrConf.attrMap) {
                    for (var attrId in results.attrConf.attrMap[attrSetId]) {
                        if (xAttr.as == attrSetId && xAttr.attr == attrId) {
                            xName = results.attrConf.attrMap[attrSetId][attrId].name + ' ('+results.attrConf.attrSetMap[attrSetId].name+')';
                        }
                        if (yAttr.as == attrSetId && yAttr.attr == attrId) {
                            yName = results.attrConf.attrMap[attrSetId][attrId].name+ ' ('+results.attrConf.attrSetMap[attrSetId].name+')';
                        }
                        if (zAttr && zAttr.as == attrSetId && zAttr.attr == attrId) {
                            zName = results.attrConf.attrMap[attrSetId][attrId].name+ ' ('+results.attrConf.attrSetMap[attrSetId].name+')';
                        }
                    }
                }
                var series = [];
                
                var unitsX = xName.indexOf('%')>-1 ? '%' : results.attrConf.attrMap.unitsX;
                var unitsY = yName.indexOf('%')>-1 ? '%' : results.attrConf.attrMap.unitsY;
                var unitsZ = zName && zName.indexOf('%')>-1 ? '%' : results.attrConf.attrMap.unitsZ;
                for (var i = 0; i < data.length; i++) {
                    var row = data[i];
                    for (var j=0;j<years.length;j++) {
                        var year = years.length>1 ? years[j] : null;
                        var yearSuffix = year ? '_y_'+year : '';
                        var obj = {x: row[xAttrName+yearSuffix], y: row[yAttrName+yearSuffix], name: row['name'], loc: row['loc'], at: row['at'], gid: row['gid']}
                        obj.z = zAttrName ? row[zAttrName+yearSuffix] : 1;
//                        obj.xTooltip = xName+': '+(obj.x!=null ? obj.x.toFixed(2) : '')+' '+unitsX;
//                        obj.yTooltip = yName+': '+(obj.y!=null ? obj.y.toFixed(2) : '')+' '+unitsY;
//                        obj.zTooltip = zName ? (zName+': '+(obj.z!=null ? obj.z.toFixed(2) : '')+' '+unitsZ) : '';
                        obj.xName = xName;
                        obj.yName = yName;
                        obj.zName = zName;
                        obj.xUnits = unitsX;
                        obj.yUnits = unitsY;
                        obj.zUnits = unitsZ;
                        obj.year = year;
                        obj.yearName = results.years[year]
                        series[j] = series[j] || [];
                        
                        series[j].push(obj);
                    }
                }
                if (newData.length>10) {
                    conf.xAxis.startOnTick = false;
                    conf.xAxis.endOnTick = false;
                    conf.yAxis.startOnTick = false;
                    conf.yAxis.endOnTick = false;
                }
                conf.chart.type = zAttrName ? 'bubble' : 'scatter'
                //conf.title.text = params['title'];
                var colors = ['rgba(128,128,255,0.7)','rgba(255,128,128,0.7)']
                for (var i=0;i<years.length;i++) {
                    conf.series.push({
                        color: colors[i] || null,
                        data: series[i],
                        year: years[i],
                        visible: invisibleYears.indexOf(years[i])>=0 ? false : true,
                        name: results.years[years[i]]
                    })
                }
                conf.xAxis.title.text = xName+' (' +unitsX+')';
                conf.yAxis.title.text = yName+' (' +unitsY+')';
                return callback(null, conf);

            }]
    }
    
    async.auto(opts);
}

module.exports = {
    getChart: getChart
}


var cfg = function() {
    var conf = {
        chart: {
            renderTo: 'container',
            type: 'scatter',
            zoomType: 'xy',
            spacingBottom: 1,
            borderColor: '#ff0000'

        },
        
        xAxis: {
            title: {
                enabled: true,
                useHTML: true,
                text: 'Height (cm)'
            },
            startOnTick: true,
            endOnTick: true,
            showLastLabel: true
        },
        tooltip: {
                    headerFormat: '',
                    pointFormat: '<span style="font-size: 10px"><b>{point.name}</b><br/>{point.xTooltip}<br/>{point.yTooltip}<br/>{point.zTooltip}</span>',
                    hideDelay: 0,
                    valueDecimals: 2,
                    useHTML: true,
                    stickyTracking: false
                },
        yAxis: {
            endOnTick: true,
            startOnTick: true,
            minPadding: 0.001,
            title: {
                useHTML: true,
                text: 'Weight (kg)'
            }
        },
//            tooltip: {
//                formatter: function() {
//                        return ''+
//                        this.x +' cm, '+ this.y +' kg';
//                }
//            },
        plotOptions: {
            
            series: {
                events: {},
                point: {
                    events: {}
                },
                tooltip: {
                    headerFormat: '',
                    pointFormat: '<span style="font-size: 10px"><b>{point.name}</b><br/>{point.xTooltip}<br/>{point.yTooltip}<br/>{point.zTooltip}</span>',
                    hideDelay: 0,
                    valueDecimals: 2,
                    useHTML: true,
                    stickyTracking: false
                },
                
                marker: {
                            //fillColor: 'rgba(128,128,255,0.7)',
                            lineColor: '#dddddd',
                            symbol: 'circle',
                            opacity: 0.5,
                            lineWidth: 1,
                            radius: 5,
                    states: {
                        select: {
                            enabled: false
                        },
                        hover: {
                            enabled: false
                        }
                    }
                },
                states: {
                    hover: {
                        enabled: false
                    },
                    select: {
                        enabled: false
                    }
                }
            }
        },
        series: []

    }
    return conf;
}