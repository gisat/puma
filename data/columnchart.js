var dataMod = require('./data');
var async = require('async')
var crud = require('../rest/crud');



function getChart(params, callback) {
    var conf = cfg();
    var attrs = JSON.parse(params['attrs']);
    var width = params['width'] || 573;
    var areas = JSON.parse(params['areas']);
    var oldAreas = params['areas']
    var years = JSON.parse(params['years']);
    var currentAt = null;
    for (var loc in areas) {
        for (var at in areas[loc]) {
            currentAt = at;
            break;
        }
    }
    var invisibleAttrs = params['invisibleAttrs'] ? JSON.parse(params['invisibleAttrs']) : [];
    var invisibleAttrsMap = {};
    for (var i=0;i<invisibleAttrs.length;i++) {
        var attr = invisibleAttrs[i];
        var dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
        invisibleAttrsMap[dataIndex] = true;
    }
    var opts = {
        
        data: function(asyncCallback, results) {
                
                var stacking = params['stacking']
                var attrsNum = (!stacking || stacking == 'none' || stacking == 'double') ? attrs.length * years.length : years.length;
                dataMod.getData(params, function(err, dataObj) {
                    if (err)
                        return callback(err);
                    return asyncCallback(null, dataObj);
                })
            },
        attrConf: function(asyncCallback) {

            dataMod.getAttrConf(params, function(err, attrConf) {
                if (err)
                    return callback(err);

                return asyncCallback(null, attrConf);
            })
        },
        res: ['data', 'attrConf',  function(asyncCallback, results) {
                var data = results.data.data;
                var attrConf = results.attrConf.attrMap;
                for (var i = 0; i < attrs.length; i++) {
                    attrs[i].serie = [];
                }
                
                var areas = JSON.parse(oldAreas);
                var categories = [];
                var aggregate = params['aggregate'];
                var aggData = results.data.aggData;
                
                
                for (var i = 0; i < data.length; i++) {
                    var row = data[i];

                    for (var j = 0; j < attrs.length; j++) {
                        var attr = attrs[j];
                        attr.series = attr.series || [];
                        attr.plotValues = attr.plotValues || [];
                        attr.plotNames = attr.plotNames || [];
                        var attrName = 'as_' + attr.as + '_attr_' + attr.attr;
                        for (var k = 0; k < years.length; k++) {
                            attr.series[k] = attr.series[k] || [];

                            var yearAttrName = years.length > 1 ? attrName + '_y_' + years[k] : attrName;
                            if (params['aggregate'] == 'toptree' && row.loc!=-1 && !attr.topTreeAlready) {
                                var aggRow = results.data.aggDataMap[row.loc];
                                attr.topTreeAlready = true;
                                attr.plotValues.push(aggRow[yearAttrName])
                                attr.plotNames.push(aggRow['name'])
                            }
                            if (params['aggregate'] == 'topall' && i==0) {
                                var aggRow = results.data.aggDataMap[-1];
                                attr.plotValues.push(aggRow[yearAttrName])
                                attr.plotNames.push(aggRow['name'])
                            }
                            if (params['aggregate'] == 'select' && i==0) {
                                var aggRow = results.data.aggDataMap['select'];
                                attr.plotValues.push(aggRow[yearAttrName])
                                attr.plotNames.push(aggRow['name'])
                            }
                            
                            
                            if (aggregate && aggregate in {min: true, avg: true, max: true}) {
                                attr.plotValues.push(results.data.aggregate[aggregate + '_' + yearAttrName]);
                                attr.plotNames.push(aggregate);
                            }
                            
                            if (params['stacking'] != 'double' || j < (attrs.length / 2)) {
                                attr.series[k].push({y: row[yearAttrName], loc: row.loc, at: row.at, gid: row.gid});
                            }
                            else {
                                attr.series[k].push({y: -row[yearAttrName], loc: row.loc, at: row.at, gid: row.gid});
                            }
                        }


                    }
                    categories.push(row['name']);
                }
                var series = [];
                var plotLines = [];
                var units = [];
                var offset = Math.ceil(attrs.length / 2);
                for (var i = 0; i < attrs.length; i++) {
                    var attr = attrs[i];
                    //console.log(attr.series)
                    if (params['forExport'] && invisibleAttrsMap['as_'+attr.as+'_attr_'+attr.attr]) {
                        continue;
                    }
                    var obj = attrConf[attr.as][attr.attr];
                    units = units || obj.units || '';
                    for (var j = 0; j < years.length; j++) {
                        var color = obj.color;
                        if ((!params['stacking'] || params['stacking']=='none') && j!=0) {
                            var rgb = hexToColor(color);
                            var opacity = Math.max(0.2,1-j*0.4);
                            color = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+opacity+')';
                        }
                        if (attr.plotValues && attr.plotValues[j]) {
                            plotLines.push({
                                color: color,
                                width: 1,
                                id: 'i' + i,
                                value: attr.plotValues[j],
                                dashStyle: 'Dash',
                                zIndex: 5
                                        ,
                                label: {
                                    text: attr.plotNames[j] + ': ' + attr.plotValues[j].toFixed(2),
                                    align: 'left',
                                    style: {
                                        color: '#000',
                                        fontSize: '12px'
                                    }
                                }
                            })
                        }
                        var dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
                        var visible = invisibleAttrsMap[dataIndex] ? false : true;
                        if (params['stacking'] != 'double') {
                            var serieData = {data: attr.series[j], name: obj.name, color: color, stack: 'y' + j, as: attr.as,attr:attr.attr,visible:visible}
                            if (!params['stacking'] || params['stacking']=='none') {
                                delete serieData.stack
                            }
                            if (j==0) {
                                serieData.id = 'a'+i;
                            }
                            else {
                                serieData.linkedTo = 'a'+i
                            }
                            series.push(serieData)
                        }
                        else {
                            var inFirst = i < offset;
                            //var name = obj.name + (inFirst ? ' +' : ' -');
                            var name = obj.name
                            if (inFirst) {
                                var serieData = {data: attr.series[j], name: name, color: color, stack: 'a' + i+'y'+j, as: attr.as,attr:attr.attr,visible:visible}
                                
                                if (j==0) {
                                    serieData.id = 'a'+i;
                                }
                                else {
                                    serieData.linkedTo = 'a'+i
                                }
                                series.push(serieData)
                            }
                            else {
                                var newIndex = i - offset;
                                var insertIndex = newIndex * 2 * years.length + j * 2 + 1;
                                var serieData = {data: attr.series[j], name: name, color: color, stack: 'a' + newIndex+'y'+j, linkedTo: 'a' + newIndex,visible:visible};
                                series.splice(insertIndex, 0, serieData)
                            }
                        }

                    }

                }
                var areasNum = data.length;
                if (!data) {
                    console.log('nodata')
                }
                var stacking = params['stacking']
                var columnNum = (!stacking || stacking == 'none' || stacking == 'double') ? areasNum * attrs.length * years.length : areasNum * years.length;
                columnNum = stacking == 'double' ? columnNum / 2 : columnNum;
                stacking = stacking == 'double' ? 'normal' : stacking;
                stacking = (!stacking || stacking=='none') ? null : stacking;
                console.log(stacking)
                var optimalWidth = Math.max(areasNum * 30, columnNum * 10, width);
                var staggerLines = Math.ceil(100 / (optimalWidth / areasNum));
                conf.chart.width = optimalWidth;
                conf.chart.height = 382;
                conf.yAxis.plotLines = plotLines.length ? plotLines : null;
                conf.xAxis.labels.staggerLines = staggerLines;
                conf.series = series;
                conf.xAxis.categories = categories;
                conf.yAxis.title.text = (stacking && stacking == 'percent') ? '%' : attrConf.units;
                conf.tooltip.valueSuffix = ' ' + attrConf.units;
                conf.plotOptions.series.stacking = stacking;
                if (params['forMap']) {
                    conf.title = null;
                    conf.legend = null;
                    conf.xAxis.title = null;
                    conf.yAxis.title = null;
                    conf.xAxis.labels.enabled = false;
                    conf.yAxis.labels.enabled = false;
                    conf.yAxis.gridLineWidth = 0;
                    conf.chart.height = 200;
                    conf.chart.width = Math.min(400, Math.max(areasNum * 30, columnNum * 10))
                }
                return callback(null, conf);

            }]
    }

    async.auto(opts);

}

module.exports = {
    getChart: getChart
}


var hexToColor = function(color) {
    var r=null;
    var g=null;
    var b=null;
    if (color.length==4) {
        r = color.slice(1,2)+color.slice(1,2);
        g = color.slice(2,3)+color.slice(2,3);
        b = color.slice(3,4)+color.slice(3,4);
    }
    if (color.length==7) {
        r = color.slice(1,3);
        g = color.slice(3,5);
        b = color.slice(5,7);
    }
    return [parseInt(r,16),parseInt(g,16),parseInt(b,16)]
}


var cfg = function() {
    var conf = {
        chart: {
            type: 'column',
            spacingBottom: 4
        },
        xAxis: {
            labels: {}

        },
        yAxis: {
            labels: {},
            title: {
                text: 'Y axis',
                useHTML: true
            },
            endOnTick: false

        },
        tooltip: {
            hideDelay: 0,
            valueDecimals: 2,
            valueSuffix: ' %',
            useHTML: true,
            followPointer: true,
            stickyTracking: false
        },
        plotOptions: {
            column: {
                
            },
            series: {
                pointPadding: 0.2,
                groupPadding: 0.1,
                events: {},
                borderWidth: 0,
                point: {
                    events: {}
                }
            }
        }
    }
    return conf;
}