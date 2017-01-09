var charts = {
	scatterchart: require('../data/scatterchart'),
	grid: require('../data/grid'),
	data: require('../data/data'),
	columnchart: require('../data/columnchart'),
	piechart: require('../data/piechart'),
	featurecount: require('../data/featurecount'),
	extentoutline: require('../data/extentoutline'),
	filter: require('../data/filter')
};
var _ = require('underscore');
var cp = require('child_process');
var async = require('async');
var fs = require('fs');
var proxy = require('./proxy');
var conn = require('../common/conn');
var confMap = {length: 0};
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

function exporter(params, req, res, callback) {
	var isWin = !!process.platform.match(/^win/);
	if (isWin){
		cp.execFile('phantomjs.exe', ['rasterize.js', 'http://'+config.localHost+':'+config.localPort+config.localPath+'/index-for-export.html?type=grid', 'out.png','-',1], {maxBuffer: 5000 * 1024}, function(err, stdout, stderr) {
			logger.info("api/chart.js stdout: " + stdout);
			logger.error("api/chart.js stderr: " + stderr);
			return callback(err);
		});
	} else {
		cp.exec('phantomjs rasterize.js http://'+config.localHost+':'+config.localPort+config.localPath+'/index-for-export.html?type=grid out.png - 1',{maxBuffer: 5000 * 1024}, function(err, stdout, stderr) {
			logger.info("api/chart.js stdout: " + stdout);
			logger.error("api/chart.js stderr: " + stderr);
			return callback(err);
		});
	}
}

var FilteredBaseLayerReferences = require('../layers/FilteredBaseLayerReferences');
var PgAttribute = require('../attributes/PgAttribute');
var PgPool = require('../postgresql/PgPool');

function getChart(params, req, res, callback) {
	// New request parameter - tooManyAreas
	// When existing and areas true; Respect the information and load the gids from the database.
	// years, start, limit
	// areas - 1. uroven place
	// areas - 2. uroven areaTemplate
	// attributes - {as}
	// Get all gids for this.
	if(params.tooManyAreas) {
		let place = Number(Object.keys(params.areas)[0]);
		let areaTemplate = Number(Object.keys(params.areas[place])[0]);
		let year = Number(params.years[0]);

		// TODO: Possible leak.
		var pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		// Get all gids for given place, areaTemplate and year - This means get the BaseLayerRefs and gids per each.
		new FilteredBaseLayerReferences({
			year: year,
			location: place,
			areaTemplate: areaTemplate,
		}, conn.getMongoDb()).layerReferences().then(baseLayerReferences => {
			return Promise.all(baseLayerReferences.map(layerReference => {
				return new PgAttribute(pool, 'views', `layer_${layerReference._id}`, `gid`).values();
			}));
		}).then(pgAttributeValues => {
			params.areas[place] = {};
			params.areas[place][areaTemplate] = _.flatten(pgAttributeValues);

			getChartInternal(params, req, res, callback);
		}).catch(err => {
			throw new Error(
				logger.error('api/chart#getChart Preload gids for tooManyAreas. Error: ', err)
			);
		});
	} else {
		getChartInternal(params, req, res, callback)
	}
}


function getChartInternal(params, req, res, callback) {
	var type = params['type'];
	var mod = charts[type];
	params['userId'] = req.session.userId;
	mod.getChart(params, function (err, conf) {
		if (err) {
			logger.error("api/chart.js getChart Error:", err, " Returning nodata");
			var noDataConf = {
				chart: {},
				noData: true,
				title: {
					text: null
				},
				credits: {
					enabled: false
				},
				labels: {
					items: [{
						html: 'No data',
						style: {
							left: '210px',
							top: params['type'] == 'featurecount' ? '48px' : '180px',
							fontSize: 40,
							color: '#999999'
						}
					}]
				}
			};
			res.data = noDataConf;
			return callback(null);
		}
		if (params['forExport']) {
			conf = _.extend(conf, require('../data/printchart'));
		}
		res.data = conf;
		callback();
	});
}



function drawChart(params, req, res, callback) {

	var gid = params['gid'];
	var confId = params['confId'];

	var jsonFile = 'tmp/' + confId + '.json';
	var svgFile = 'tmp/' + confId + '_%gid%.svg';

	var nullTime = new Date().getTime();
	console.log("api/chart.js drawChart nullTime: " + nullTime);
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

	async.auto({
		conf: function(asyncCallback, results) {
			params['forMap'] = true;
			mod.getChart(params, function(err, conf) {
				if (err){
					logger.error("api/chart.js drawChart conf Error: ", err, " Configuration: ", conf);
					return callback(err);
				}
				asyncCallback(err, conf);
			});
		},
		inFile: ['conf', function(asyncCallback, results) {
			//console.log(new Date().getTime()-nullTime)
			fs.writeFile(jsonFile, JSON.stringify(results.conf), function(err) {
				if (err){
					return callback(err);
				}
				asyncCallback(err, null);
			});
		}],
		phantom: ['inFile', 'conf', function(asyncCallback, results) {
			//console.log(new Date().getTime()-nullTime)
			//console.log('start ' + new Date().getTime());
			cp.execFile('phantomjs.exe', ['highcharts-convert.js', '-infile', jsonFile, '-outfile', svgFile, '-constr', 'Chart'], {maxBuffer: 5000 * 1024}, function(err, stdout, stderr) {
				//console.log(stdout)
				confMap.length += results.conf.length;
				if (confMap.length > 20000) {
					confMap = {length: 0}
				}
				confMap[confId] = JSON.parse(stdout);
				return callback(confMap[confId][gid]);
			});
		}]
	});
}

function getGridData(params, req, res, callback) {
	params['userId'] = req.session.userId;
	async.auto({
		attrConf: function(asyncCallback) {
			charts.data.getAttrConf(params, function(err, attrConf) {
				if (err){
					logger.error("api/chart.js getGridData attrConf Error: ", err, " AttrConf: ", attrConf);
					return callback(err);
				}
				return asyncCallback(null, attrConf);
			});
		},
		res: ['attrConf', function(asyncCallback, results) {
			params.attrMap = results.attrConf.prevAttrMap;
			charts.data.getData(params, function(err, dataObj) {
				if (err){
					logger.error("api/chart.js getGridData res Error: ", err, " Data: ", dataObj);
					return callback(err);
				}
				res.data = dataObj.data;
				res.total = dataObj.total;
				return callback();
			})
		}]
	});
}

function getGridDataCsv(params,req,res,callback) {
	params['userId'] = req.session.userId;
	charts.grid.createCsv(params, function(err, fileName) {
		res.downFile = [fileName,'griddata.csv'];
		return callback(null);
	});
}

module.exports = {
	getChart: getChart,
	drawChart: drawChart,
	getGridData: getGridData,
	exporter: exporter,
	getGridDataCsv: getGridDataCsv
};
