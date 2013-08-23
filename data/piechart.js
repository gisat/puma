var dataMod = require('./data');
var async = require('async')
var crud = require('../rest/crud');

function getChart(params, callback) {
    var attrs = JSON.parse(params['attrs']);
    var width = params['width'] || 535;
    var height = params['height'] || 320;
    var years = JSON.parse(params['years']);
    var invisibleAttrs = params['invisibleAttrs'] ? JSON.parse(params['invisibleAttrs']) : [];
    var invisibleAttrsMap = {};
    for (var i=0;i<invisibleAttrs.length;i++) {
        var attr = invisibleAttrs[i];
        var dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
        invisibleAttrsMap[dataIndex] = true;
    }
    var opts = {
        data: function(asyncCallback) {
            
            dataMod.getData(params, function(err, dataObj) {
                if (err)
                    return callback(err);
                return asyncCallback(null, dataObj.data);
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
        attrConf: function(asyncCallback) {
            dataMod.getAttrConf(params, function(err, attrConf) {
                if (err)
                    return callback(err);

                return asyncCallback(null, attrConf);
            })
        },
        res: ['data', 'attrConf','years', function(asyncCallback, results) {
                var forMap = params['forMap']
                var attrConf = results.attrConf.attrMap;
                var data = results.data;
                var numRecs = data.length;
                var numRows = years.length>1 ? years.length : Math.round(Math.sqrt(numRecs * height / width))
                var numCols = years.length>1 ? numRecs : Math.ceil(numRecs / numRows);
                width = years.length>1 ? Math.max(width,numRecs*(height/years.length)) : width;
                var minusHeight = numRecs > 15 ? 5 : 20;
                var minusHeight = numRecs > 40 ? 0 : minusHeight;
                var size = Math.min(width / numCols, (height / numRows) - minusHeight);
                var i = 0;
                var series = [];

                var sizeMinus = data.length > 40 ? 22 : 30;
                //sizeMinus = years.length>1 ? sizeMinus + 8 : sizeMinus;
                
                var labels = [];

                function chartIteration(row,ri,rj,year) {
                    var serieData = [];
                    for (var j = 0; j < attrs.length; j++) {
                        var attr = attrs[j];
                        var columnName = 'as_' + attr.as + '_attr_' + attr.attr;
                        var visible = invisibleAttrsMap[columnName] ? false : true;
                        if (params['forExport'] && !visible) {
                            continue;
                        }
                        if (year) {
                            columnName += '_y_'+year;
                        }
                        var attrRec = attrConf[attr.as][attr.attr];
                        
                        var obj = {
                            name: attrRec.name,
                            as: attr.as,
                            visible: visible,
                            attr: attr.attr,
                            y: row[columnName],
                            color: attrRec.color
                        }
                        serieData.push(obj)
                    }
                    var center = {
                        x: (width / numCols) * (rj + 0.5),
                        y: (height / numRows) * (ri + 0.5)
                    }
                    var serieName = row.name;
                    serieName += (year ? (' '+results.years[year]) : '');
                    var serie = {
                        data: serieData,
                        name: serieName,
                        loc: row.loc,
                        at: row.at,
                        gid: row.gid,
                        type: 'pie',
                        showInLegend: ri==0 && rj==0,
                        dataLabels: {
                            enabled: false
                        },
                        size: forMap ? 20 : (size - sizeMinus)
                    }
                    if (!forMap) {
                        serie.center = [center.x, center.y]
                    }
                    series.push(serie);
                    if (data.length <= 15 || year) {
                        var left = center.x - size / 2 + 30;
                        var top = center.y - size / 2;
                        labels.push({
                            html: serieName,
                            style: {
                                left: left + 'px',
                                top: top + 'px'
                            }
                        })
                    }
                }


                var year = null;
                for (var ri = 0; ri < numRows; ri++) {
                    if (years.length>1) {
                        year = years[ri];
                        i = 0;
                    }
                    for (var rj = 0; rj < numCols; rj++) {
                        var row = data[i];
                        if (!row)
                            break;
                        chartIteration(row,ri,rj,year);              
                        i++;
                    }
                }
            
                var confs = [];
                if (params['forMap']) {
                    for (var i = 0; i < series.length; i++) {
                        var conf = cfg();
                        var serie = series[i]
                        //conf.title.text = '';
                        //conf.legend.enabled = false;
                        conf.chart.height = 65;
                        conf.chart.width = 65;
                        conf.chart.backgroundColor = null;
                        conf.labels = [];
                        conf.series = [serie];
                        conf.gid = serie.gid;
                        confs.push(conf);
                    }
                }

                else {
                    var conf = cfg();
                    conf.series = series;
                    //conf.chart.width = years.length>1 ? width+24 : null;
                    conf.chart.height = years.length>1 ? 382 : null;
                    conf.chart.spacingBottom = years.length>1 ? 1 : 10;
                    //conf.title.text = params['title']
                    if (data.length <= 15) {
                        conf.labels = {
                            items: labels
                        }
                    }
                    conf.tooltip.valueSuffix = ' ' + attrConf.units;
                }
                return callback(null, confs.length ? confs : conf)

            }]
    }

    async.auto(opts);

}
var cfg = function() {
    var conf = {
        plotOptions: {
            pie: {
                point: {
                    events: {}
                }
            },
            series: {
                point: {
                    events: {}
                },
                events: {}
            }
        },
        chart: {
            spacingLeft: 0,
            spacingBottom: 1,
            spacingRight: 0
        },
        xAxis: {
            categories: [],
            title: 'Test'
        },
        tooltip: {
            hideDelay: 0,
            valueDecimals: 2,
            useHTML: true,
            //valueSuffix: ' ' + attrConf.units,
            followPointer: true,
            stickyTracking: false
        },
        series: []
    }
    return conf
}


module.exports = {
    getChart: getChart
}


