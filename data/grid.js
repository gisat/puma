var dataMod = require('./data');
var fs = require('fs');
var async = require('async');
var crud = require('../rest/crud');
var _ = require('underscore');
let logger = require('../common/Logger').applicationWideLogger;

function getChart(params, callback) {

	var years = JSON.parse(params['years']);
	var attrs = JSON.parse(params['attrs']);
	var filters = params['activeFilters'] ? JSON.parse(params['activeFilters']) : [];
	var filterMap = {};
	for (var i = 0; i < filters.length; i++) {
		filterMap[filters[i].dataIndex] = filters[i].value
	}

	var moreYears = years.length > 1;
	var opts = {
		years: function(asyncCallback) {
			crud.read('year', {}, function(err, resls) {
				if (err)
					return callback(err);
				var map = {};
				for (var i = 0; i < resls.length; i++) {
					var resl = resls[i];
					map[resl['_id']] = resl.name;
				}
				return asyncCallback(null, map)
			})
		},
		res: ['years', function(asyncCallback, results) {
				dataMod.getAttrConf(params, function(err, attrMap) {
					if (err)
						return callback(err);
					attrMap = attrMap.attrMap;
					var columns = [{
							dataIndex: 'name',
							text: 'Name',
							flex: 1,
							minWidth: 140,
							filter: {
								type: 'string'
							}
						}];
					var fields = ['gid', 'name', 'at', 'loc'];
					var dataIndexes = [];
					for (var i = 0; i < attrs.length; i++) {
						var attr = attrs[i];
						var attrConf = attrMap[attr.as][attr.attr];
						//var attrName = attrConf.code || (attrConf.name > 15 ? (attrConf.Name.slice(0, 13)+'...') : attrConf.name);
						var attrName = (attrConf.name.length > 14 ? (attrConf.name.slice(0, 12)+'...') : attrConf.name);
						var fullName = attrConf.name;
						for (var j = 0; j < years.length; j++) {
							var year = years[j];
							var dataIndex = 'as_' + attr.as + '_attr_' + attr.attr;
							dataIndex += moreYears ? ('_y_' + year) : '';
							if (_.contains(dataIndexes,dataIndex)) {
								continue;
							}
							dataIndexes.push(dataIndex);
							var filter = {
								type: 'numeric'
							}
							if (filterMap[dataIndex]) {
								filter.active = true;
								filter.value = filterMap[dataIndex]
							}
							columns.push({
								dataIndex: dataIndex,
								units: attrConf.units,
								xtype: 'numbercolumn',
								tooltip: attrConf.name + ' '+results.years[year],
								text: fullName,
								yearName: results.years[year],
								fullName: fullName,
								minWidth: 150,
								filter: filter
							})
							fields.push(dataIndex);

						}
					}


					var result = {
						columns: columns,
						fields: fields,
						units: attrMap.units
					}
					callback(null, result);


				})
			}]
	}
	async.auto(opts)


}

function createCsv(params, callback) {
	var fileName = '/tmp/' + generateId() + '.csv';
	var attrs = JSON.parse(params['attrs']);
	var years = JSON.parse(params['years']);
	params['limit'] = null;
	params['start'] = null;

	var opts = {

		data: ['attrConf',function(asyncCallback,results) {
			logger.info(`data/grid#createCsv data`);
			params.attrMap = results.attrConf.prevAttrMap;
			dataMod.getData(params, function(err, dataObj) {
				if (err) {
					logger.error(`data/grid#createCsv data Error: `, err);
					return callback(err);
				}

				logger.info(`data/grid#createCsv data Result. `, dataObj);
				return asyncCallback(null, dataObj);
			})
		}],
		attrConf: function (asyncCallback) {
			logger.info(`data/grid#createCsv attrConf Params: `, params);
			dataMod.getAttrConf(params, function (err, attrMap) {
				if (err) {
					logger.error(`data/grid#createCsv attrConf Error: `, err);
					return callback(err);
				}

				logger.info(`data/grid#createCsv attrConf Result.`);
				return asyncCallback(null, attrMap)
			})
		},
		yearMap: function(asyncCallback) {
			logger.info(`data/grid#createCsv yearMap Years: `, years);
			crud.read('year', {_id: {$in: years}}, function(err, resls) {
				if (err) {
					logger.error(`data/grid#yearMap attrConf Error: `, err);
					return callback(err);
				}

				logger.info(`data/grid#createCsv yearMap Result. `, resls);
				var yearMap = {};
				for (var i=0;i<resls.length;i++) {
					yearMap[resls[i]._id] = resls[i];
				}
				return asyncCallback(null, yearMap)
			})
		},
		file: function(asyncCallback) {
			logger.info(`data/grid#createCsv file Trying to open file. FileName: ${fileName}`);
			fs.open(fileName, 'w', function(err, fd) {
				if(err) {
					logger.error(`data/grid#createCsv file Error: `, err);
					return callback(err);
				}

				return asyncCallback(null, fd);
			});
		},
		result: ['data', 'attrConf', 'yearMap', 'file', function (asyncCallback, results) {
			logger.info(`data/grid#createCsv result Started.`);
			var data = results.data.data;
			var attrs = JSON.parse(params['attrs']);
			var attrArray = [];
			var firstRow = '"GID","NAME"';
			var normalization = params['normalization'];
			var normText = '';
			var fileText = '';
			if (normalization && normalization != 'none') {
				var text = '';
				if (normalization == 'area') {
					text = 'area'
				}
				if (normalization == 'toptree') {
					text = results.data.aggData[0].name
				}
				if (normalization == 'attributeset' || normalization == 'attributeset') {
					text = results.attrConf.attrSetMap[params['normalizationAttributeSet']].name;
				}
				if (normalization == 'attribute') {
					text += '-' + results.attrConf.attrMap[params['normalizationAttributeSet']][params['normalizationAttribute']].name;
				}
				normText = '(norm. by ' + text + ')';
			}
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i];
				for (var j = 0; j < years.length; j++) {
					var year = years[j];
					attrArray.push('as_' + attr.as + '_attr_' + attr.attr + (years.length > 1 ? '_y_' + year : ''))
					firstRow += ',"';
					firstRow += results.attrConf.attrSetMap[attr.as].name + '-';
					firstRow += results.attrConf.attrMap[attr.as][attr.attr].name;
					firstRow += ' ' + results.yearMap[year].name + ' ';
					firstRow += normText + ' ('
					firstRow += results.attrConf.attrMap.units + ')"';
				}
			}
			fileText += firstRow + '\n';

			for (var i = 0; i < data.length; i++) {
				var row = data[i];
				var rowText = row.gid + ',' + row.name;
				for (var j = 0; j < attrArray.length; j++) {
					var attrName = attrArray[j];
					rowText += ',';
					rowText += row[attrName];
				}

				fileText += rowText + '\n';
			}
			logger.info(`data/grid#createCsv Write File. Name: ${fileName}, Text: `, fileText);
			fs.writeFile(fileName, fileText, function (err) {
				if (err) {
					logger.error(`data/grid#createCsv result Error: `, err);
					return callback(err);
				}
				return callback(null, fileName);
			})

		}]
	};
	async.auto(opts);
}


var generateId = function() {
	var time = new Date().getTime();
	var random = Math.round(Math.random() * 100000000);
	var id = time.toString(32) + random.toString(32);
	return id;
}

module.exports = {
	getChart: getChart,
	createCsv: createCsv
}
