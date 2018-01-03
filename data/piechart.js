var _ = require('underscore');
var onecolor = require('onecolor');
var async = require('async');

var dataMod = require('./data');
var crud = require('../rest/crud');


function getChart(params, callback) {
	let attrs = JSON.parse(params['attrs']);
	let width = params['width'] || 535;
	let height = params['height'] || 320;
	let years = JSON.parse(params['years']);
	let pastYears = years;
	years = [years[years.length-1]];
	params.years = JSON.stringify(years);
	let invisibleAttrs = params['invisibleAttrs'] ? JSON.parse(params['invisibleAttrs']) : [];
	let invisibleAttrsMap = {};
	for (let i=0;i<invisibleAttrs.length;i++) {
		let attr = invisibleAttrs[i];
		let dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
		invisibleAttrsMap[dataIndex] = true;
	}
	let isSingle = attrs.length == 1;

	async.auto({
		data: ['attrConf', function(asyncCallback,results) {
			params.attrMap = results.attrConf.prevAttrMap;
			dataMod.getData(params, function(err, dataObj) {
				if (err) {
					return callback(err);
				}
				return asyncCallback(null, dataObj.data);
			});
		}],

		data2: ['data', function(asyncCallback,results) {
			let data = results.data;

			if (data.length>5 || pastYears.length<2) {
				return asyncCallback(null,[]);
			}
			let newParams = _.clone(params);
			newParams.years = JSON.stringify([pastYears[pastYears.length-2]]);
			years.push(pastYears[pastYears.length-2]);
			years.reverse();
			dataMod.getData(newParams, function(err, dataObj) {
				if (err) {
					return callback(err);
				}
				return asyncCallback(null, dataObj.data);
			});
		}],

		years: function(asyncCallback) {
			crud.read('year', {}, function(err, resls) {
				if (err) {
					return callback(err);
				}
				let map = {};
				for (let i=0;i<resls.length;i++) {
					let resl = resls[i];
					map[resl['_id']] = resl.name;
				}
				return asyncCallback(null,map);
			});
		},

		attrConf: function(asyncCallback) {
			dataMod.getAttrConf(params, function(err, attrConf) {
				if (err) {
					return callback(err);
				}
				return asyncCallback(null, attrConf);
			});
		},

		res: ['data2', 'attrConf','years', function(asyncCallback, results) {
			let forMap = params['forMap'];
			let attrConf = results.attrConf.attrMap;
			let data = _.union(results.data2,results.data);
			let numRecs = data.length;
			let numRows = Math.round(Math.sqrt(numRecs * height / width));
			let numCols = Math.ceil(numRecs / numRows);
			// width = years.length>1 ? Math.max(width,numRecs*(height/years.length)) : width;
			let minusHeight = numRecs > 15 ? 5 : 20;
			minusHeight = numRecs > 40 ? 0 : minusHeight;
			let size = Math.min(width / numCols, (height / numRows) - minusHeight);
			let i = 0;
			let series = [];

			let sizeMinus = data.length > 40 ? 22 : 30;
			// sizeMinus = years.length>1 ? sizeMinus + 8 : sizeMinus;

			let labels = [];

			function chartIteration(row,ri,rj,year,yearId) {
				let serieData = [];
				for (let j = 0; j < attrs.length; j++) {
					let attr = attrs[j];
					let columnName = 'as_' + attr.as + '_attr_' + attr.attr;
					let visible = !invisibleAttrsMap[columnName];
					if (params['forExport'] && !visible) {
						continue;
					}
          // if (year) {
          // 	columnName += '_y_'+year;
          // }
					let attrRec = attrConf[attr.as][attr.attr];
					if (attrRec.color.length == 0){
						attrRec.color = "#000000";
					}
					let obj = {
						name: attrRec.name,
						units: attrRec.displayUnits || attrRec.units,  // TODO: Replace these units by the display units, if they were set.
						as: attr.as,
						visible: visible,
						attr: attr.attr,
						y: +row[columnName],
						color: attrRec.color
					};

					serieData.push(obj);
					if (isSingle) {
						// let c1 = onecolor(attrRec.color).saturation(0.1).hex();
						// console.log(c1)
						// let c2 = onecolor(attrRec.color).saturation(.3).lightness(.95).hex();
						// console.log(c2)
						let secondObj = _.clone(obj);
						secondObj.color = onecolor(attrRec.color).saturation(0.1).lightness(.96).hex();
						secondObj.name = 'Other';
						secondObj.y = 100-obj.y;
						secondObj.swap = true;
						serieData.push(secondObj);
					}
				}
				let center = {
					x: (width / numCols) * (rj + 0.5),
					y: (height / numRows) * (ri + 0.5)
				};
				let serieName = row.name;
				// serieName += (year ? (' '+results.years[year]) : '');
				let serie = {
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
				};
				if (!forMap) {
					serie.center = [center.x, center.y];
				}
				if (isSingle) {
					let attrRec = attrConf[attrs[0].as][attrs[0].attr];
					if (numRecs>8) {
						serie.innerSize = '17%';
						serie.pieFontShift = 8;
						serie.pieFontSize = 21;
					} else if (numRecs>6) {
						serie.innerSize = '23%';
						serie.pieFontShift = 10;
						serie.pieFontSize = 28;
					} else if (numRecs>2) {
						serie.innerSize = '28%';
						serie.pieFontShift = 11;
						serie.pieFontSize = 32;
					} else {
						serie.innerSize = '50%';
						serie.pieFontShift = 15;
						serie.pieFontSize = 50;
					}

					serie.pieFontColor = attrRec.color;
					let y = Math.round(serie.data[0].y);
					serie.pieText = y+'%';
				}
				series.push(serie);
				if (data.length <= 15 || year) {
					let left = center.x - size / 2 + 30;
					let top = center.y - size / 2;
					labels.push({
						html: serieName,
						style: {
							left: left + 'px',
							top: top + 'px'
						}
					});
				}
			}


			let year = null;
			for (let ri = 0; ri < numRows; ri++) {

				for (let rj = 0; rj < numCols; rj++) {
					let row = data[i];
					year = years[0];
					if (years.length>1 && i>=data.length/2) {
						year = years[1];
					}
					let yearId = year;
					if (!row) {
						break;
					}
					chartIteration(row,ri,rj,year,yearId);
					i++;
				}
			}

			let conf;
			let confs = [];
			if (params['forMap']) {
				for (let i = 0; i < series.length; i++) {
					let conf = cfg();
					conf = _.extend(conf,require('../data/defaultchart'));
					let serie = series[i];
					// conf.title.text = '';
					// conf.legend.enabled = false;
					conf.chart.height = 65;
					conf.chart.width = 65;
					conf.chart.backgroundColor = null;
					conf.labels = [];
					conf.series = [serie];
					conf.gid = serie.gid;
					confs.push(conf);
				}
			} else {
				conf = cfg();
				conf = _.extend(conf,require('../data/defaultchart'));
				conf.series = series;
				// conf.chart.width = years.length>1 ? width+24 : null;
				conf.chart.height = years.length>1 ? 382 : null;
				conf.chart.spacingBottom = years.length>1 ? 1 : 10;
				if (isSingle) {
					conf.chart.isPieSingle = true;
				}
				// conf.title.text = params['title']
				if (data.length <= 15) {
					conf.labels = {
						items: labels
					}
				}
				conf.tooltip.valueSuffix = ' ' + attrConf.units;
			}
			return callback(null, confs.length ? confs : conf);

		}]
	}); // async.auto

}

let cfg = function() {
	return {
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
	};
};


module.exports = {
	getChart: getChart
};


