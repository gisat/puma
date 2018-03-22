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

			let categories = [];
			let aggregate = params['aggregate'];
			let polarAxesNormalization = (params['polarAxesNormalizationSettings'] === "yes");

			let yUnits = '';

			// iterate data
			for (let i = 0; i < data.length; i++) { //
				let row = data[i]; //

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

						if (aggregate && aggregate in {min: true, avg: true, max: true}) {
							let value = results.data.aggregate[aggregate + '_' + yearAttrName];
							value = parseFloat(value);
							attr.plotValues.push(value);
							attr.plotNames.push(aggregate);
						}

						// pushing data values to series here
						attr.series[k].push({
							y: +row[yearAttrName],
							units: attr.displayUnits || attr.units,
							loc: row.loc,
							at: row.at,
							gid: row.gid,
							year: years[k],
							yearName: results.years[years[k]]
						});
					}


				}
				categories.push(row['name']);
			}


			let chartData = [];

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
				}
			}
			conf.chartData = chartData;
			conf.categories = categories;
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
