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
			let periodsSettingsPolarChart = params['periodsSettingsPolarChart'];
			let latestPeriodIndex = years.length-1;

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
				categories.push({
					gid: row['gid'],
					name: row['name']
				});
			}



			// prepare series data according to PERIODS counting method
			// seriesByPeriods - 3D array: seriesByPeriods[attributeIndex][serieIndex][periodIndex]
			// computedSeries - array of attr objects
			//     computedSeries[attributeIndex].serie (array of values)
			//                                   .units
			//                                   .as (id)
			//                                   .attr (id)
			let seriesByPeriods = [];
			for (let attributeIndex = 0; attributeIndex < attrs.length; attributeIndex++) {
				let series = attrs[attributeIndex].series;
				seriesByPeriods[attributeIndex] = seriesByPeriods[attributeIndex] || [];
				for (let periodIndex = 0; periodIndex < series.length; periodIndex++) {
					let serie = series[periodIndex];
					for (let serieIndex = 0; serieIndex < serie.length; serieIndex++) {
						seriesByPeriods[attributeIndex][serieIndex] = seriesByPeriods[attributeIndex][serieIndex] || [];
						seriesByPeriods[attributeIndex][serieIndex][periodIndex] = serie[serieIndex].y;
					}
				}
			}
			let computedSeries = [];
			for (let attributeIndex = 0; attributeIndex < seriesByPeriods.length; attributeIndex++) {
				computedSeries[attributeIndex] = computedSeries[attributeIndex] || {
					serie: [],
					units: attrs[attributeIndex].units,
					as: attrs[attributeIndex].as,
					attr: attrs[attributeIndex].attr,
					name: attrs[attributeIndex].attrName
				};
				for (let serieIndex = 0; serieIndex < seriesByPeriods[attributeIndex].length; serieIndex++) {
					switch(periodsSettingsPolarChart){
						case "latest":
							computedSeries[attributeIndex].serie[serieIndex] = seriesByPeriods[attributeIndex][serieIndex][latestPeriodIndex];
							break;

						case "average":
							let values = seriesByPeriods[attributeIndex][serieIndex];
							let total = 0;
							for(let i = 0; i < values.length; i++) {
								total += values[i];
							}
							computedSeries[attributeIndex].serie[serieIndex] = total / values.length;
							break;

						case "min":
							computedSeries[attributeIndex].serie[serieIndex] = Math.min.apply(Math, seriesByPeriods[attributeIndex][serieIndex]);
							break;

						case "max":
							computedSeries[attributeIndex].serie[serieIndex] = Math.max.apply(Math, seriesByPeriods[attributeIndex][serieIndex]);
							break;
					}
				}
			}


			// find out mins and maxs of series
			let totalMin = null;
			let totalMax = null;
			let attrMinMap = [];
			let attrMaxMap = [];
			for (let attributeIndex = 0; attributeIndex < computedSeries.length; attributeIndex++) {
				let serie = computedSeries[attributeIndex].serie;
				let min = Math.min.apply(Math, serie);
				let max = Math.max.apply(Math, serie);
				attrMinMap[attributeIndex]
					= (attrMinMap[attributeIndex])
					? Math.min(attrMinMap[attributeIndex], min)
					: min;
				attrMaxMap[attributeIndex]
					= (attrMaxMap[attributeIndex])
					? Math.max(attrMaxMap[attributeIndex], max)
					: max;
				totalMin = totalMin ? Math.min(totalMin, min) : min;
				totalMax = totalMax ? Math.max(totalMax, max) : max;
			}


			// complete chartData
			let chartData = [];
			for (let attributeIndex = 0; attributeIndex < computedSeries.length; attributeIndex++) {
				let attr = computedSeries[attributeIndex];

				// skip invisible attributes
				if (params['forExport'] && invisibleAttrsMap['as_'+attr.as+'_attr_'+attr.attr]) {
					continue;
				}

				// fill chartData from attr.series
				let min = polarAxesNormalization ? attrMinMap[attributeIndex] : totalMin;
				let max = polarAxesNormalization ? attrMaxMap[attributeIndex] : totalMax;
				for(let serieIndex = 0; serieIndex < attr.serie.length; serieIndex++) {
					let serieValue = attr.serie[serieIndex];

					// count percentage value
					let minimumPosition = ((min >= 0.05*max) || (min < 0)) ? 0.05 : 0;
					let maximumPosition = 1;
					let value = ((serieValue - min) / (max - min)) * (maximumPosition - minimumPosition) + minimumPosition;
					value = Math.round(value * 100) / 100;

					let label = categories[serieIndex]['name'] + ": " + serieValue;
					if (attr.units){
						label += " " + attr.units;
					}

					chartData[serieIndex] = chartData[serieIndex] ? chartData[serieIndex] : [];
					chartData[serieIndex][attributeIndex] = {
						axis: attr.name,
						value: value,
						label: label
					};
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

let cfg = function() {
	return {

	};
};
