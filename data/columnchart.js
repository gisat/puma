var dataMod = require('./data');
var async = require('async');
var crud = require('../rest/crud');

var logger = require('../common/Logger').applicationWideLogger;

var _ = require('underscore');

let lodash = require('lodash');

function getChart(params, callback) {
	var conf = cfg();
	conf = _.extend(conf,require('../data/defaultchart'));
	var attrs = JSON.parse(params['attrs']);
	var width = params['width'] || 560;
	var areas = JSON.parse(params['areas']);
	var oldAreas = params['areas'];
	var years = JSON.parse(params['years']);
	var currentAt = null;
	for (var loc in areas) {
		for (var at in areas[loc]) {
			currentAt = at;
//			break;
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

		data: ['attrConf',function(asyncCallback,results) {
				params.attrMap = results.attrConf.prevAttrMap;
				var stacking = params['stacking'];
				var attrsNum = (!stacking || stacking == 'none' || stacking == 'double') ? attrs.length * years.length : years.length;
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
		years: getYears,
		res: ['years','data', 'attrConf',  function(asyncCallback, results) {
				var data = results.data.data;
				var attrConf = results.attrConf.attrMap;
				for (var i = 0; i < attrs.length; i++) {
					attrs[i].serie = [];
				}

				var areas = JSON.parse(oldAreas);
				var categories = [];
				let extendedCategories = [];
				var aggregate = params['aggregate'];
				var aggData = results.data.aggData;

				var yUnits = '';

				for (var i = 0; i < data.length; i++) {
					var row = data[i];

					for (var j = 0; j < attrs.length; j++) {
						var attr = attrs[j];
						if (!attr.units) {
							var obj = attrConf[attr.as][attr.attr];
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
						var attrName = 'as_' + attr.as + '_attr_' + attr.attr;
						for (var k = 0; k < years.length; k++) {
							attr.series[k] = attr.series[k] || [];

							var yearAttrName = years.length > 1 ? attrName + '_y_' + years[k] : attrName;
							if (params['aggregate'] == 'toptree' && row.loc!=-1 && !attr.topTreeAlready) {
								var aggRow = results.data.aggDataMap[row.loc];
								var value = parseFloat(aggRow[yearAttrName]);
								if (aggRow) {
									attr.topTreeAlready = true;
									attr.plotValues.push(value);
									attr.plotNames.push(aggRow['name']);
								}
							}
							if (params['aggregate'] == 'topall' && i==0) {
								var aggRow = results.data.aggDataMap[-1];
								var value = parseFloat(aggRow[yearAttrName]);
								if (aggRow) {
									attr.plotValues.push(value);
									attr.plotNames.push(aggRow['name']);
								}
							}
							if (params['aggregate'] == 'select' && i==0) {
								var aggRow = results.data.aggDataMap['select'];
								var value = parseFloat(aggRow[yearAttrName]);
								attr.plotValues.push(value);
								attr.plotNames.push(aggRow['name']);
							}


							if (aggregate && aggregate in {min: true, avg: true, max: true}) {
								var value = results.data.aggregate[aggregate + '_' + yearAttrName];
								value = parseFloat(value);
								attr.plotValues.push(value);
								attr.plotNames.push(aggregate);
							}

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
					extendedCategories.push(row['gid']);
				}

				// === prepare data series ===
                // how many colums will each category have
                let numberOfColumns = years.length;
                let periodsSettings = 'all';

				var series = [];
				var plotLines = [];
				var offset = Math.ceil(attrs.length / 2);

				for (var i = 0; i < attrs.length; i++) {
					var attr = attrs[i];
					//console.log(attr.series)
					if (params['forExport'] && invisibleAttrsMap['as_'+attr.as+'_attr_'+attr.attr]) {
						continue;
					}
					var obj = attrConf[attr.as][attr.attr];

					// if periodsSettings, use it for creating data series
					if (params['periodsSettings'] && (params['periodsSettings'] !== 'all')){
                        let newApproachData = getDataForNewApproachChartCreation({
                        	aggregate: params['aggregate'],
                            attributeConfiguration: obj,
							attributeIndex: i,
                            attributeMetadata: attr,
                            originalSeries: attr.series,
                            periodSettings: params['periodsSettings'],
							plotLines: plotLines,
                            sortedCategories: extendedCategories,
							stacking: params['stacking']
                        });
                        series = series.concat(newApproachData.series);
                        plotLines = newApproachData.plotLines;
                    }

                    // else use old approach (for all periods)
                    else {
                        for (var j = 0; j < numberOfColumns; j++) {
                            // set color of column
                            var color = obj.color;
                            if ((!params['stacking'] || params['stacking']=='none') && j!=0) {
                                color = getColorRgbaString(color, j);
                            }

                            // average values
                            if (attr.plotValues && attr.plotValues[j]) {
                                plotLines.push({
                                    color: color,
                                    width: 1,
                                    id: 'i' + i,
                                    value: attr.plotValues[j],
                                    dashStyle: 'Dash',
                                    zIndex: 5,
                                    label: {
                                        text: attr.plotNames[j] + ': ' + attr.plotValues[j].toFixed(2),
                                        align: 'left',
                                        style: {
                                            color: '#333',
                                            fontFamily: '"Open Sans", sans-serif',
                                            fontSize: '12px'
                                        }
                                    }
                                });
                            }


                            var dataIndex = 'as_'+attr.as+'_attr_'+attr.attr;
                            var visible = invisibleAttrsMap[dataIndex] ? false : true;
                            if (params['stacking'] != 'double') {
                                var serieData = {data: prepareDataForPeriod(attr.series, periodsSettings, j, extendedCategories), name: obj.name, color: color, stack: 'y' + j, as: attr.as,attr:attr.attr,visible:visible};
                                if (!params['stacking'] || params['stacking']=='none') {
                                    delete serieData.stack;
                                }
                                if (j==0) {
                                    serieData.id = 'a'+i;
                                } else {
                                    serieData.linkedTo = 'a'+i;
                                }
                                series.push(serieData);
                            } else {
                                var inFirst = i < offset;
                                //var name = obj.name + (inFirst ? ' +' : ' -');
                                var name = obj.name;
                                if (inFirst) {
                                    var serieData = {data: prepareDataForPeriod(attr.series, periodsSettings, j, extendedCategories), name: name, color: color, stack: 'a' + i+'y'+j, as: attr.as,attr:attr.attr,visible:visible};

                                    if (j==0) {
                                        serieData.id = 'a'+i;
                                    } else {
                                        serieData.linkedTo = 'a'+i;
                                    }
                                    series.push(serieData);
                                } else {
                                    var newIndex = i - offset;
                                    var insertIndex = newIndex * 2 * years.length + j * 2 + 1;
                                    var serieData = {data: prepareDataForPeriod(attr.series, periodsSettings, j, extendedCategories), name: name, color: color, stack: 'a' + newIndex+'y'+j, linkedTo: 'a' + newIndex,visible:visible};
                                    series.splice(insertIndex, 0, serieData);
                                }
                            }
                        }
                    }
				}
				var areasNum = data.length;
				var stacking = params['stacking'];
				var columnNum = (!stacking || stacking == 'none' || stacking == 'double') ? areasNum * attrs.length * numberOfColumns : areasNum * numberOfColumns;
				columnNum = stacking == 'double' ? columnNum / 2 : columnNum;
				stacking = stacking == 'double' ? 'normal' : stacking;
				stacking = (!stacking || stacking=='none') ? null : stacking;
				var optimalWidth = Math.max(areasNum * 30, columnNum * 10, width);
				var staggerLines = Math.ceil(120 / (optimalWidth / areasNum));
				conf.chart.width = optimalWidth;
				conf.chart.height = 382;
				conf.yAxis.plotLines = plotLines.length ? plotLines : null;
				conf.xAxis.labels.staggerLines = staggerLines;
				conf.series = series;
				conf.xAxis.categories = categories;
				conf.yAxis.title.text = (stacking && stacking == 'percent') ? '%' : yUnits;
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
					conf.chart.width = Math.min(400, Math.max(areasNum * 30, columnNum * 10));
				}
				return callback(null, conf);
			}]
	};

	async.auto(opts);
}

/**
 * Get all available years
 * @param asyncCallback {function}
 */
function getYears(asyncCallback) {
    crud.read('year', {}, function(err, resls) {
        if (err){
            logger.error("columnchart#getChart Read years. Error: ", err);
            return callback(err);
        }
        var map = {};
        for (var i=0;i<resls.length;i++) {
            var resl = resls[i];
            map[resl['_id']] = resl.name;
        }
        return asyncCallback(null,map);
    });
}

module.exports = {
	getChart: getChart,
	getYears: getYears
};

/**
 * Collect all relevant data for chart creation
 * @param params {Object}
 * @param params.aggregate {string}
 * @param params.attributeConfiguration {Object}
 * @param params.attributeIndex {number}
 * @param params.attributeMetadata {Object}
 * @param params.originalSeries {Array} List of orriginal data
 * @param params.periodSettings {string} specifies how should be the data calculated (e.g. min, max, average,...)
 * @param params.plotLines {Array}
 * @param params.sortedCategories {Array} orted list of categories for x-axis (gids in this case)
 * @param params.stacking {string}
 * @returns {Object}
 */
let getDataForNewApproachChartCreation = function(params){
    let outputSeries = [];
    let series = prepareDataForPeriod(params.originalSeries, params.periodSettings, 0, params.sortedCategories);

    let hasNestedArrays = _.isArray(series[0]);
    if (!hasNestedArrays){
        series = [series];
    }

    series.map((serie, index) => {

        // set color of column
        let columnColor = params.attributeConfiguration.color;
        if (index !== 0) {
            columnColor = getColorRgbaString(columnColor, index);
        }
        let attr = params.attributeMetadata;

        // average values TODO other possibilities
		if (params.aggregate && params.aggregate === "avg"){
            params.plotLines.push(setChartLineForAggregation(params.aggregate, columnColor, params.attributeIndex, serie));
		}

        // prepare serie data
        let serieData = {data: serie, name: params.attributeConfiguration.name, color: columnColor, stack: 'y' + index, as: attr.as, attr: attr.attr, visible: true};
        if (!params.stacking || params.stacking === 'none') {
            delete serieData.stack;
        }

        if (index === 0) {
            serieData.id = 'a' + params.attributeIndex;
        } else {
            serieData.linkedTo = 'a' + params.attributeIndex;
        }
        outputSeries.push(serieData);
    });

    return {
    	plotLines: params.plotLines,
        series: outputSeries
    }
};

/**
 * Prepare data for given period (represented by index) according to periodSettings
 * @param series {Array} data
 * @param periodSettings {string} specifies how should be the data calculated
 * @param index {number} index of serie
 * @param categories {Array} sorted list of categories (gids)
 * @returns {Array} Sorted serie for period/calculated serie
 */
let prepareDataForPeriod = function(series, periodSettings, index, categories){
	if (periodSettings === 'all'){
		return series[index];
    } else {
	    let groupedData = lodash.cloneDeep(groupDataByGid(series));
	    let serie;

	    if (periodSettings === 'average'){
	        serie = getAverageValue(groupedData);
        } else if (periodSettings === 'latest'){
	        serie = getDataForExtremeValue(groupedData, 'yearName', true);
        } else if (periodSettings === 'min'){
            serie = getDataForExtremeValue(groupedData, 'y', false);
        } else if (periodSettings === 'max'){
            serie = getDataForExtremeValue(groupedData, 'y', true);
        } else if (periodSettings === 'minMax') {
            serie = getDataForMoreValues(groupedData, false);
        } else if (periodSettings === 'minAverageMax') {
            serie = getDataForMoreValues(groupedData, true);
        }
        return sortSerieByCategories(serie, categories);
    }
};

/**
 * Sort records in serie according to a order in categories
 * @param series {Array} Serie for period/calculated serie
 * @param categories {Array} sorted list of categories (gids)
 * @returns {Array} Sorted serie/series
 */
let sortSerieByCategories = function(series, categories){
    let sorted = [];
    let hasNestedArrays = _.isArray(series[0]);

    if (!hasNestedArrays){
        categories.map(category => {
            let records = _.filter(series, function (item) {return item.gid === category});
            sorted.push(records[0]);
        });
    } else {
        let columns = series.length;
        for(let i = 0; i < columns; i++){
            sorted.push([]);
        }
        categories.map(category => {
            series.map((serie, index) => {
                let records = _.filter(serie, function (item) {return item.gid === category});
                sorted[index].push(records[0]);
            });
        });
    }
    return sorted;
};

/**
 * TODO currently, the latest period is the highest yearName value
 * @param dataForGids {Object} Data grouped by gid
 * @param column {string} source column for data
 * @param isMax {boolean} false for min
 * @returns {Array} Serie for given setting
 */
let getDataForExtremeValue = function(dataForGids, column, isMax){
	let serie = [];

	for (let gid in dataForGids){
        let type = "max";
        if (!isMax){
            type = "min";
        }
        serie.push(findCollection(type, dataForGids[gid], column));
	}
	return serie;
};

/**
 * Get data for more than one value. Currently is implemented combination of min and max TODO min, average and max value
 * @param dataForGids {Object} Data grouped by gid
 * @param withAverage {boolean} true, if series should contain average value
 * @returns {Array} Series for given settings
 */
let getDataForMoreValues = function(dataForGids, withAverage){
    let series = [];

    let serieMin = [];
    for (let gid in dataForGids){
        serieMin.push(findCollection("min", dataForGids[gid], 'y'));
    }
    series.push(serieMin);

    if (withAverage){
        series.push(getAverageValue(dataForGids));
	}

    let serieMax = [];
    for (let gid in dataForGids){
        serieMax.push(findCollection("max", dataForGids[gid], 'y'));
    }
    series.push(serieMax);

    return series;
};

/**
 * @param dataForGids {Object} Data grouped by gid
 * @returns {Array} Serie with average values
 */
let getAverageValue = function(dataForGids){
    let serie = [];
    for (let gid in dataForGids){
        let records = dataForGids[gid];
        let refRecord = lodash.cloneDeep(records[0]);
        let sum = 0;
        let count = 0;
        records.map(record => {
           sum += record.y;
           count++;
        });

        refRecord.y = Math.round((sum/count), 2);
        refRecord.year = null;
        refRecord.yearName = "average";
        serie.push(refRecord);
    }
    return serie;
};


/**
 * @param series {Array} Original series
 * @returns {Object} Data grouped by gid
 */
let groupDataByGid = function(series){
	let data = {};
	series.map(serie => {
		serie.map(record => {
			let gid = record.gid;
			if (!data[gid]){
				data[gid] = [record];
			} else {
				data[gid].push(record);
			}
		});
	});

	return data;
};

/**
 * Find collection by min or max value of the property in the list of collections
 * @param type {string} min or max
 * @param data {Array} List of collections
 * @param column {string} name of property key
 * @return collection {Object}
 */
let findCollection = function(type, data, column){
    if (type === "min"){
    	let filtered = _.min(data, function(item){ return Number(item[column]);});
        let collection = lodash.cloneDeep(filtered);
        collection.yearName += " - minimum";
        return collection;
    } else if (type === "max"){
        let filtered =  _.max(data, function(item){return Number(item[column]);});
        let collection = lodash.cloneDeep(filtered);
        collection.yearName += " - maximum";
        return collection;
    }
};

/**
 * Set line for averages
 * @param type {string} type of aggregation
 * @param color {string}
 * @param attributeIndex {number}
 * @param serie {Array}
 * @returns {{color: *, width: number, id: string, value: *, dashStyle: string, zIndex: number, label: {text: string, align: string, style: {color: string, fontFamily: string, fontSize: string}}}}
 */
let setChartLineForAggregation = function(type, color, attributeIndex, serie){
	let value = 0;
	let name = "";
	if (type === 'avg'){
		name = "Average";
		value = calculateValueForAverageLine(serie);
	}

    return {
		color: color,
		width: 1,
		id: 'i' + attributeIndex,
		value: value,
		dashStyle: 'Dash',
		zIndex: 5,
		label: {
			text: name + ': ' + value.toFixed(2),
			align: 'left',
			style: {
				color: '#333',
				fontFamily: '"Open Sans", sans-serif',
				fontSize: '12px'
			}
		}
    }
};

/**
 * Calculate average from data
 * @param serie {Array} source data
 * @returns {number} average value of serie
 */
let calculateValueForAverageLine = function(serie){
	let sum = 0;
	let numberOfRecords = serie.length;
	serie.map(record => {
		sum += record.y;
	});
	return (sum/numberOfRecords);
};

/**
 * @param color {string} color in HEX format
 * @returns {string} string in rgba format
 */
let getColorRgbaString = function(color, j){
    let rgb = hexToColor(color);
    let opacity = Math.max(0.2,1-j*0.4);
    return 'rgba('+rgb[0]+','+rgb[1]+','+rgb[2]+','+opacity+')';
};


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
	return [parseInt(r,16),parseInt(g,16),parseInt(b,16)];
};

var cfg = function() {
	var conf = {
		chart: {
			type: 'column',
			spacingRight: 25,
			spacingBottom: 4
		},
		xAxis: {
			labels: {}

		},
		yAxis: {
			labels: {},
			title: {
				text: 'Y axis',
				style: {
					color: '#222',
					fontWeight: 'normal'
				},
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
	};
	return conf;
};
