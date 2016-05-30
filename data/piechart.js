var dataMod = require('./data');
var async = require('async')
var crud = require('../rest/crud');
var _ = require('underscore');
var onecolor = require('onecolor');
function getChart(params, callback) {
	var attrs = JSON.parse(params['attrs']);
	var width = params['width'] || 535;
	var height = params['height'] || 320;
	var years = JSON.parse(params['years']);
	var pastYears = years;
	years = [years[years.length-1]];
	params.years = JSON.stringify(years);
	var invisibleAttrs = params['invisibleAttrs'] ? JSON.parse(params['invisibleAttrs']) : [];
	var invisibleAttrsMap = {};
	for (var i=0;i<invisibleAttrs.length;i++) {
		var attr = invisibleAttrs[i];
		var dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
		invisibleAttrsMap[dataIndex] = true;
	}
	var isSingle = attrs.length == 1;
	var opts = {
		data: ['attrConf',function(asyncCallback,results) {
			params.attrMap = results.attrConf.prevAttrMap;
			dataMod.getData(params, function(err, dataObj) {
				if (err)
					return callback(err);
				return asyncCallback(null, dataObj.data);
			})
		}],
		data2: ['data',function(asyncCallback,results) {
			var data = results.data;

			if (data.length>5 || pastYears.length<2) {
				return asyncCallback(null,[]);
			}
			var newParams = _.clone(params);
			newParams.years = JSON.stringify([pastYears[pastYears.length-2]]);
			years.push(pastYears[pastYears.length-2]);
			years.reverse();
			dataMod.getData(newParams, function(err, dataObj) {
				if (err)
					return callback(err);
				return asyncCallback(null, dataObj.data);
			})

		}],
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
		res: ['data2', 'attrConf','years', function(asyncCallback, results) {
				var forMap = params['forMap']
				var attrConf = results.attrConf.attrMap;
				var data = _.union(results.data2,results.data);
				var numRecs = data.length;
				var numRows = Math.round(Math.sqrt(numRecs * height / width))
				var numCols = Math.ceil(numRecs / numRows);
				//width = years.length>1 ? Math.max(width,numRecs*(height/years.length)) : width;
				var minusHeight = numRecs > 15 ? 5 : 20;
				var minusHeight = numRecs > 40 ? 0 : minusHeight;
				var size = Math.min(width / numCols, (height / numRows) - minusHeight);
				var i = 0;
				var series = [];

				var sizeMinus = data.length > 40 ? 22 : 30;
				//sizeMinus = years.length>1 ? sizeMinus + 8 : sizeMinus;

				var labels = [];

				function chartIteration(row,ri,rj,year,yearId) {
					var serieData = [];
					for (var j = 0; j < attrs.length; j++) {
						var attr = attrs[j];
						var columnName = 'as_' + attr.as + '_attr_' + attr.attr;
						var visible = invisibleAttrsMap[columnName] ? false : true;
						if (params['forExport'] && !visible) {
							continue;
						}
//                        if (year) {
//                            columnName += '_y_'+year;
//                        }
						var attrRec = attrConf[attr.as][attr.attr];

						var obj = {
							name: attrRec.name,
							units: attrRec.units,
							as: attr.as,
							visible: visible,
							attr: attr.attr,
							y: +row[columnName],
							color: attrRec.color
						}

						serieData.push(obj)
						if (isSingle) {
							var c1 = onecolor(attrRec.color).saturation(0.1).hex();
							//console.log(c1)
							var c2 = onecolor(attrRec.color).saturation(.3).lightness(.95).hex();
							//console.log(c2)
							var secondObj = _.clone(obj);
							secondObj.color = onecolor(attrRec.color).saturation(0.1).lightness(.96).hex();
							secondObj.name = 'Other'
							secondObj.y = 100-obj.y;
							secondObj.swap = true;
							serieData.push(secondObj);
						}
					}
					var center = {
						x: (width / numCols) * (rj + 0.5),
						y: (height / numRows) * (ri + 0.5)
					}
					var serieName = row.name;
					//serieName += (year ? (' '+results.years[year]) : '');
					var serie = {
						data: serieData,
						year: year,
						yearName: results.years[yearId],
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
					if (isSingle) {
						var attrRec = attrConf[attrs[0].as][attrs[0].attr];
						if (numRecs>8) {
							serie.innerSize = '17%'
							serie.pieFontShift = 8;
							serie.pieFontSize = 21;
						}
						else if (numRecs>6) {
							serie.innerSize = '23%'
							serie.pieFontShift = 10;
							serie.pieFontSize = 28;
						}
						else if (numRecs>2) {
							serie.innerSize = '28%';
							serie.pieFontShift = 11;
							serie.pieFontSize = 32;
						}
						else {
							serie.innerSize = '50%';
							serie.pieFontShift = 15;
							serie.pieFontSize = 50;
						}

						serie.pieFontColor = attrRec.color;
						var y = Math.round(serie.data[0].y);
						serie.pieText = y+'%';
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

					for (var rj = 0; rj < numCols; rj++) {
						var row = data[i];
						year = years[0];
						if (years.length>1 && i>=data.length/2) {
							year = years[1];
						}
						var yearId = year;
						if (!row)
							break;
						chartIteration(row,ri,rj,year,yearId);
						i++;
					}
				}

				var confs = [];
				if (params['forMap']) {
					for (var i = 0; i < series.length; i++) {
						var conf = cfg();
						conf = _.extend(conf,require('../data/defaultchart'))
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
					conf = _.extend(conf,require('../data/defaultchart'))
					conf.series = series;
					//conf.chart.width = years.length>1 ? width+24 : null;
					conf.chart.height = years.length>1 ? 382 : null;
					conf.chart.spacingBottom = years.length>1 ? 1 : 10;
					if (isSingle) {
						conf.chart.isPieSingle = true;
					}
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
};


