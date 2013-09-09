var charts = {
    scatterchart: require('../data/scatterchart'),
    grid: require('../data/grid'),
    data: require('../data/data'),
    columnchart: require('../data/columnchart'),
    piechart: require('../data/piechart'),
    featurecount: require('../data/featurecount'),
    extentoutline: require('../data/extentoutline'),
    filter: require('../data/filter')
}
var us = require('underscore')
var cp = require('child_process');
var async = require('async');
var fs = require('fs');
var proxy = require('./proxy');
var conn = require('../common/conn')
var confMap = {length: 0};

function shutdown(params,req,res,callback) {
    setTimeout(function() {
        var y = x + 5;
    },1);
}


function exporter(params, req, res, callback) {
    cp.execFile('phantomjs.exe', ['rasterize.js', 'http://'+conn.getLocalAddress()+'/public/index3.html?type=grid', 'out.png','-',1], {maxBuffer: 5000 * 1024}, function(err, stdout, stderr) {
        return callback(err)
    })
}

function getChart(params, req, res, callback) {
    var type = params['type'];
    var mod = charts[type];
    params['userId'] = req.userId;
    mod.getChart(params, function(err, conf) {
        if (err) {
            console.log('returning nodata')
            var noDataConf = {
                chart: {
                },
                noData: true,
                title: {
                    text: params['title']
                },
                credits: {
                                enabled: false
                            },
                labels: {items: [{
                            
                            html: 'No data',
                            style: {
                                left: '210px',
                                top: params['type'] == 'featurecount' ? '48px' : '180px',
                                fontSize: 40,
                                color: '#999999'

                            }
                        }]}};
                        res.data = noDataConf;
                        return callback(null);
        }
        if (params['forExport']) {
            conf = us.extend(conf,require('../data/printchart'))
        }
        res.data = conf;
        callback();
    })
}




function drawChart(params, req, res, callback) {

    var gid = params['gid'];
    var confId = params['confId'];

    var jsonFile = 'tmp/' + confId + '.json';
    var svgFile = 'tmp/' + confId + '_%gid%.svg';

    var nullTime = new Date().getTime();
    console.log(nullTime)
    var intervalFc = null;
    function testConf() {
        if (confMap[confId]) {
            clearInterval(intervalFc);
            res.data = confMap[confId][gid];
            res.encType = 'utf8';
            res.contType = 'image/svg+xml';
            return callback(null);
//            fs.readFile(svgFile.replace('%gid%', gid), function(err, data) {
//                console.log(new Date().getTime()-nullTime)
//                if (err)
//                    return callback(err);
//                
//            })
        }
    }
    if (confMap[confId] != null) {
        intervalFc = setInterval(testConf, 100);
        testConf();
        return;
    }
    confMap[confId] = false;

    params = proxy.chartConfMap[confId];



    var type = params['type'];
    var mod = charts[type];

    var opts = {
        conf: function(asyncCallback, results) {
            params['forMap'] = true;
            mod.getChart(params, function(err, conf) {
                if (err)
                    return callback(err);
                asyncCallback(err, conf);
            })
        },
        inFile: ['conf', function(asyncCallback, results) {
                //console.log(new Date().getTime()-nullTime)
                fs.writeFile(jsonFile, JSON.stringify(results.conf), function(err) {
                    if (err)
                        return callback(err);
                    asyncCallback(err, null);
                })
            }],
        phantom: ['inFile', 'conf', function(asyncCallback, results) {
                //console.log(new Date().getTime()-nullTime)
                console.log('start ' + new Date().getTime());
                cp.execFile('phantomjs.exe', ['highcharts-convert.js', '-infile', jsonFile, '-outfile', svgFile, '-constr', 'Chart'], {maxBuffer: 5000 * 1024}, function(err, stdout, stderr) {
                    //console.log(stdout)
                    confMap.length += results.conf.length;
                    if (confMap.length > 20000) {
                        confMap = {length: 0}
                    }
                    confMap[confId] = JSON.parse(stdout);
                    return callback(confMap[confId][gid])
                })
            }]}

    async.auto(opts);

}

function getGridData(params, req, res, callback) {
    params['userId'] = req.userId;
    var opts = {
        attrConf: function(asyncCallback) {
            charts.data.getAttrConf(params, function(err, attrConf) {
                if (err)
                    return callback(err);

                return asyncCallback(null, attrConf);
            })
        },
        res: ['attrConf', function(asyncCallback, results) {
                params.attrMap = results.attrConf.prevAttrMap;
                charts.data.getData(params, function(err, dataObj) {
                    if (err)
                        return callback(err);
                    res.data = dataObj.data;
                    res.total = dataObj.total;
                    return callback();
                })
            }]
    }
    async.auto(opts)
}

function getGridDataCsv(params,req,res,callback) {
    params['userId'] = req.userId;
    charts.grid.createCsv(params, function(err, fileName) {
        res.downFile = [fileName,'griddata.csv'];
        return callback(null);
    })
}

var generateId = function() {
    var time = new Date().getTime();
    var random = Math.round(Math.random() * 100000000);
    var id = time.toString(32) + random.toString(32);
    return id;
}



module.exports = {
    getChart: getChart,
    drawChart: drawChart,
    getGridData: getGridData,
    exporter: exporter,
    shutdown: shutdown,
    getGridDataCsv: getGridDataCsv
}


