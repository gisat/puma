const dataMod = require('./data');
const async = require('async');
const crud = require('../rest/crud');

const logger = require('../common/Logger').applicationWideLogger;

const _ = require('underscore');

function getChart(params, callback) {
	let conf = cfg();
	conf = _.extend(conf,require('../data/defaultD3Chart'));
	let attrs = JSON.parse(params['attrs']);
	let width = params['width'] || 560;
	let areas = JSON.parse(params['areas']);
	let oldAreas = params['areas'];
	let years = JSON.parse(params['years']);
	let currentAt = null;
	for (let loc in areas) {
		if (!areas.hasOwnProperty(loc)) continue;
		for (let at in areas[loc]) {
			currentAt = at;
			// break;
		}
	}
	let invisibleAttrs = params['invisibleAttrs'] ? JSON.parse(params['invisibleAttrs']) : [];
	let invisibleAttrsMap = {};
	for (let i=0;i<invisibleAttrs.length;i++) {
		let attr = invisibleAttrs[i];
		let dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
		invisibleAttrsMap[dataIndex] = true;
	}


	// TODO rewrite to promises
	async.auto({
		data: ['attrConf',function(asyncCallback,results) {
			params.attrMap = results.attrConf.prevAttrMap;
			let stacking = params['stacking'];
			let attrsNum = (!stacking || stacking == 'none' || stacking == 'double') ? attrs.length * years.length : years.length;
			dataMod.getData(params, function(err, dataObj) {
				if (err) {
					logger.error("columnchart#getChart data. Error: ", err);
					return callback(err);
				}
				return asyncCallback(null, dataObj);
			})
		}],
		attrConf: function(asyncCallback) {

			dataMod.getAttrConf(params, function(err, attrConf) {
				if (err) {
					logger.error("columnchart#getChart attrConf. Error: ", err);
					return callback(err);
				}

				return asyncCallback(null, attrConf);
			})
		},
		years: function(asyncCallback) {
			crud.read('year', {}, function(err, resls) {
				if (err){
					logger.error("columnchart#getChart Read years. Error: ", err);
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
		res: ['years','data', 'attrConf',  function(asyncCallback, results) {
			let data = results.data.data;
			let attrConf = results.attrConf.attrMap;
			for (let i = 0; i < attrs.length; i++) {
				attrs[i].serie = [];
			}

			let areas = JSON.parse(oldAreas);
			let categories = [];
			let aggregate = params['aggregate'];
			let polarAxesNormalization = (params['polarAxesNormalizationSettings'] === "yes");
			let aggData = results.data.aggData;

			let yUnits = '';
			// let attr = null;

			// iterate data
			for (let i = 0; i < data.length; i++) {
				let row = data[i];

				for (let j = 0; j < attrs.length; j++) {
					let attr = attrs[j];
					if (!attr.units) {
						let obj = attrConf[attr.as][attr.attr];
						attr.units = obj.units;
						if (yUnits && yUnits!=obj.units) {
							yUnits = 'miscellaneous';
						} else {
							yUnits = obj.units;
						}
					}
					attr.series = attr.series || [];

					attr.plotValues = attr.plotValues || [];
					attr.plotNames = attr.plotNames || [];
					let attrName = 'as_' + attr.as + '_attr_' + attr.attr;
					for (let k = 0; k < years.length; k++) {
						attr.series[k] = attr.series[k] || [];

						let yearAttrName = years.length > 1 ? attrName + '_y_' + years[k] : attrName;
						if (params['aggregate'] == 'toptree' && row.loc!=-1 && !attr.topTreeAlready) {
							let aggRow = results.data.aggDataMap[row.loc];
							let value = parseFloat(aggRow[yearAttrName]);
							if (aggRow) {
								attr.topTreeAlready = true;
								attr.plotValues.push(value);
								attr.plotNames.push(aggRow['name']);
							}
						}
						if (params['aggregate'] == 'topall' && i==0) {
							let aggRow = results.data.aggDataMap[-1];
							let value = parseFloat(aggRow[yearAttrName]);
							if (aggRow) {
								attr.plotValues.push(value);
								attr.plotNames.push(aggRow['name']);
							}
						}
						if (params['aggregate'] == 'select' && i==0) {
							let aggRow = results.data.aggDataMap['select'];
							let value = parseFloat(aggRow[yearAttrName]);
							attr.plotValues.push(value);
							attr.plotNames.push(aggRow['name']);
						}


						if (aggregate && aggregate in {min: true, avg: true, max: true}) {
							let value = results.data.aggregate[aggregate + '_' + yearAttrName];
							value = parseFloat(value);
							attr.plotValues.push(value);
							attr.plotNames.push(aggregate);
						}

						// pushing data values to series here
						if (params['stacking'] != 'double' || j < (attrs.length / 2)) {
							attr.series[k].push({
								y: +row[yearAttrName],
								units: attr.displayUnits || attr.units,
								loc: row.loc,
								at: row.at,
								gid: row.gid,
								year: years[k],
								yearName: results.years[years[k]]
							});
						} else {
							attr.series[k].push({
								y: -row[yearAttrName],
								units: attr.displayUnits || attr.units,
								loc: row.loc,
								at: row.at,
								gid: row.gid,
								year: years[k],
								yearName: results.years[years[k]]
							});
						}
					}


				}
				categories.push(row['name']);
			}










			let chartData = [];
			// let series = [];
			let plotLines = [];
			// var units = [];
			let offset = Math.ceil(attrs.length / 2);

			// find out mins and maxs of series
			let totalMin = null;
			let totalMax = null;
			let attrPeriodMinMap = {};
			let attrPeriodMaxMap = {};
			for (let attributeIndex = 0; attributeIndex < attrs.length; attributeIndex++) {
				let series = attrs[attributeIndex].series;
				for (let periodIndex = 0; periodIndex < series.length; periodIndex++) {
					// pole objektů
					let serie = series[periodIndex];
					let min = Math.min.apply(Math, serie.map(function(o){return o.y;}));
					let max = Math.max.apply(Math, serie.map(function(o){return o.y;}));
					attrPeriodMinMap[attributeIndex] = attrPeriodMinMap[attributeIndex] || {};
					attrPeriodMaxMap[attributeIndex] = attrPeriodMaxMap[attributeIndex] || {};
					attrPeriodMinMap[attributeIndex][periodIndex]
						= (attrPeriodMinMap[attributeIndex][periodIndex])
						? Math.min(attrPeriodMinMap[attributeIndex][periodIndex], min)
						: min;
					attrPeriodMaxMap[attributeIndex][periodIndex]
						= (attrPeriodMaxMap[attributeIndex][periodIndex])
						? Math.max(attrPeriodMaxMap[attributeIndex][periodIndex], max)
						: max;
					totalMin = totalMin ? Math.min(totalMin, min) : min;
					totalMax = totalMax ? Math.max(totalMax, max) : max;
				}
			}

			// iterate attributes...
			for (let attributeIndex = 0; attributeIndex < attrs.length; attributeIndex++) {
				let attr = attrs[attributeIndex];
				// console.log(attr.series)

				// skip invisible attributes
				if (params['forExport'] && invisibleAttrsMap['as_'+attr.as+'_attr_'+attr.attr]) {
					continue;
				}

				let attributeObject = attrConf[attr.as][attr.attr];

				/////// ITERATE years / periods
				for (let periodIndex = 0; periodIndex < years.length; periodIndex++) {
					let color = attributeObject.color;
					// let serieData = {};
					if ((!params['stacking'] || params['stacking']=='none') && periodIndex!=0) {
						let rgb = hexToColor(color);
						let opacity = Math.max(0.2,1-periodIndex*0.4);
						color = 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+opacity+')';
					}
					// if (attr.plotValues && attr.plotValues[periodIndex]) {
					// 	plotLines.push({
					// 		color: color,
					// 		width: 1,
					// 		id: 'attributeIndex' + attributeIndex,
					// 		value: attr.plotValues[periodIndex],
					// 		dashStyle: 'Dash',
					// 		zIndex: 5,
					// 		label: {
					// 			text: attr.plotNames[periodIndex] + ': ' + attr.plotValues[periodIndex].toFixed(2),
					// 			align: 'left',
					// 			style: {
					// 				color: '#333',
					// 				fontFamily: '"Open Sans", sans-serif',
					// 				fontSize: '12px'
					// 			}
					// 		}
					// 	});
					// }

					// fill chartData from attr.series
					let min = polarAxesNormalization ? attrPeriodMinMap[attributeIndex][periodIndex] : totalMin;
					let max = polarAxesNormalization ? attrPeriodMaxMap[attributeIndex][periodIndex] : totalMax;
					for(let serieIndex = 0; serieIndex < attr.series[periodIndex].length; serieIndex++) {
						let serie = attr.series[periodIndex][serieIndex];

						// count percentage value
						let minimumPosition = ((min >= 0.05*max) || (min < 0)) ? 0.05 : 0;
						let maximumPosition = 1;
						let value = ((serie.y - min) / (max - min)) * (maximumPosition - minimumPosition) + minimumPosition;
						value = Math.round(value * 100) / 100;

						let label = categories[serieIndex] + ": " + serie.y;
						if (serie.units){
							label += " " + serie.units;
						}

						chartData[serieIndex] = chartData[serieIndex] ? chartData[serieIndex] : [];
						chartData[serieIndex][attributeIndex] = {
							axis: attributeObject.name,
							value: value,
							label: label
						};
					}


					// let dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
					// let visible = !invisibleAttrsMap[dataIndex];
					// serieData.name = attributeObject.name;
					// serieData.data = attr.series[periodIndex];
					// serieData.color = color;
					// serieData.as = attr.as;
					// serieData.attr = attr.attr;
					// serieData.visible = visible;
					// if (periodIndex==0) {
					// 	serieData.id = 'a'+attributeIndex;
					// } else {
					// 	serieData.linkedTo = 'a'+attributeIndex;
					// }

					// let insertIndex = null;

					// set stacking
					// if (params['stacking'] != 'double') {
					// 	serieData.stack = 'y' + periodIndex;
					// 	if (!params['stacking'] || params['stacking']=='none') {
					// 		delete serieData.stack;
					// 	}
					// } else {
					// 	let inFirst = attributeIndex < offset;
					// 	if (inFirst) {
					// 		serieData.stack = 'a' + attributeIndex+'y'+periodIndex;
					// 	} else {
					// 		let newIndex = attributeIndex - offset;
					// 		insertIndex = newIndex * 2 * years.length + periodIndex * 2 + 1;
					// 		serieData.stack = 'a' + newIndex+'y'+periodIndex;
					// 		serieData.linkedTo = 'a' + newIndex;
					//
					// 	}
					// }

					// // insert serieData to series
					// if (insertIndex !== null) {
					// 	series.splice(insertIndex, 0, serieData);
					// } else {
					// 	series.push(serieData);
					// }

				}

			}
			let areasNum = data.length;
			if (!data) {
				// console.log('nodata')
			}
			let stacking = params['stacking'];
			let columnNum = (!stacking || stacking == 'none' || stacking == 'double') ? areasNum * attrs.length * years.length : areasNum * years.length;
			columnNum = stacking == 'double' ? columnNum / 2 : columnNum;
			stacking = stacking == 'double' ? 'normal' : stacking;
			stacking = (!stacking || stacking=='none') ? null : stacking;
			let optimalWidth = Math.max(areasNum * 30, columnNum * 10, width);
			let staggerLines = Math.ceil(120 / (optimalWidth / areasNum));
			// conf.chart.width = optimalWidth;
			// conf.chart.height = 382;
			// conf.yAxis.plotLines = plotLines.length ? plotLines : null;
			// conf.xAxis.labels.staggerLines = staggerLines;
			// conf.series = series;
			conf.chartData = chartData;
			conf.categories = categories;
			// conf.xAxis.categories = categories;
			// conf.yAxis.title.text = (stacking && stacking == 'percent') ? '%' : yUnits;
			// conf.tooltip.valueSuffix = ' ' + attrConf.units;
			// conf.plotOptions.series.stacking = stacking;
			if (params['forMap']) {
				// conf.title = null;
				// conf.legend = null;
				// conf.xAxis.title = null;
				// conf.yAxis.title = null;
				// conf.xAxis.labels.enabled = false;
				// conf.yAxis.labels.enabled = false;
				// conf.yAxis.gridLineWidth = 0;
				// conf.chart.height = 200;
				// conf.chart.width = Math.min(400, Math.max(areasNum * 30, columnNum * 10));
			}
			return callback(null, conf);

		}]
	});

}

module.exports = {
	getChart: getChart
};


let hexToColor = function(color) {
	let r = null;
	let g = null;
	let b = null;
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
	return [parseInt(r,16),parseInt(g,16),parseInt(b,16)];
};


let cfg = function() {
	return {

	};
};
