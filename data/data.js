var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');

let Units = require('../attributes/Units');

function getData(params, callback) {

	var client = conn.getPgDataDb();

	var areas = JSON.parse(params['areas']);
	var selectedAreas = params['selectedAreas'] ? JSON.parse(params['selectedAreas']) : [];
	var defSelectedArea = params['defSelectedArea'] ? JSON.parse(params['defSelectedArea']) : null;
	var attrs = JSON.parse(params['attrs']);
	if (attrs[0].normType=='select') {
		params['normalization'] = 'select';
	}
	var years = JSON.parse(params['years']);
	var normalization = params['normalization'] || null;
	var normalizationYear = params['normalizationYear'] ? parseInt(params['normalizationYear']) : null;
	var normalizationAttributeSet = params['normalizationAttributeSet'] ? parseInt(params['normalizationAttributeSet']) : null;
	var normalizationAttribute = params['normalizationAttribute'] ? parseInt(params['normalizationAttribute']) : null;


//    var userAggregates = {
//        276: {
//            281: {
//                3507: {
//                    name: 'Malang',
//                    gids: [3507, 3514]
//                },
//                3515: {
//                    name: 'Sidoarjo',
//                    gids: [3515, 3516]
//                }
//            }
//        }
//    }
	//params['useAggregation'] = true;

	var sort = params['sort'] ? JSON.parse(params['sort']) : [{property: 'name', direction: 'ASC'}];
	var sortProperty = sort ? sort[0].property : null;
	var filter = params['filter'] ? JSON.parse(params['filter']) : [];
	// limit
	// start
	var filterSql = '';
	for (var i = 0; i < filter.length; i++) {
		var f = filter[i];
		var compOperator = ' LIKE \'%';
		switch (f.comparison) {
			case 'lt':
				compOperator = '<';
				break;
			case 'gt':
				compOperator = '>';
				break;
			case 'lteq':
				compOperator = '<=';
				break;
			case 'gteq':
				compOperator = '>=';
				break;
			case 'eq':
				compOperator = '=';
				break;
		}
		filterSql += ' AND ' + f.field + compOperator + f.value + (f.comparison ? '' : '%\'');
	}


	var topAll = params['aggregate'] == 'topall' || params['normalization'] == 'topall' || params['topall'];
	var topLoc = params['aggregate'] == 'toptree' || params['normalization'] == 'toptree' || params['toptree'];
	var aggSelect =  params['aggregate'] == 'select' || params['normalization'] == 'select';

	var layerRefMap = {};

	var select = "SELECT ";
	var anotherNormYear = (normalization && normalizationYear && years.indexOf(normalizationYear) < 0);
	var moreYears = years.length > 1;
	if (moreYears) {
		topAll = false;
		topLoc = false;
	}
	var aliases = [];


	var attrsWithSort = attrs;
	if (sort && sortProperty && sortProperty != 'name') {
		var as = sortProperty.split('_')[1].split('_')[0];
		var attr = sortProperty.split('_')[3].split('_')[0];

		var attrObj = {
			as: as,
			attr: attr
		};
		if (params['sortNorm']) {
			_.extend(attrObj, JSON.parse(params['sortNorm']))
		}
		attrsWithSort = _.union(attrs, [attrObj]);
	}

	logger.info('data/data.js#getData Years: ', years, ' attrsWithSort: ', attrsWithSort, ' Normalization: ', params['normalization'], ' Normalization2: ', normalization, ' NormalizationAttribute: ', normalizationAttribute);
	for (var i = 0; i < years.length; i++) {
		var yearId = years[i];
		var pre = 'x_' + yearId + '.';
		var normPre = (normalization && normalizationYear) ? ('x_' + normalizationYear + '.') : pre;
		select += i == 0 ? ('%%gid%% AS gid') : '';
		select += i == 0 ? (',%%name%% AS name') : '';
		select += i == 0 ? (',%%at%% AS at') : '';
		select += i == 0 ? (',%%loc%% AS loc') : '';
		select += i == 0 ? (',%%pr%% AS pr') : '';
		var topAllSql = '';
		var topAllMap = {};
		if (topAll) {
			topAllSql += 'SELECT -1 as gid,\'All\' as name,area';
		}
		for (var j = 0; j < attrsWithSort.length; j++) {
			var attr = attrsWithSort[j];
			var attrName = attr.area ? 'area' : ('as_' + attr.as + '_attr_' + attr.attr);
			var aliasAttrName = moreYears ? (attrName + '_y_' + yearId) : attrName;
			if (_.contains(attrs,attr)) {
				if (_.contains(aliases,aliasAttrName)) {
					continue;
				}
				aliases.push(aliasAttrName);
			} else {
				aliasAttrName = aliasAttrName+'_sort';
			}


			if (params['normalization'] == 'toptree' || params['normalization'] == 'topall' || attr.normType == 'toptree' || attr.normType == 'topall') {
				attr.normType = null;
			}
			var currentNorm = attr.normType;
			var currentNormAttr = attr.normAttr || (attr.normAs ? attr.attr : null) || normalizationAttribute;
			var currentNormAttrSet = attr.normAs || normalizationAttributeSet;
			let normalizationUnits = attr.normalizationUnits;
			let percentage = attr.percentage;

			var normAttrName = null;
			var norm = '';
			var attrUnits = null;
			var normAttrUnits = null;
			var factor = 1;
			var attrMap = params.attrMap;
			//var prevAttrMap = params.prevAttrMap;


			// This represents unit of the source attribute.
			if (attrMap && attrMap[attr.as] && attrMap[attr.as][attr.attr]) {
				attrUnits = attrMap[attr.as][attr.attr].units;
			}
			// If there is normalization attribute set, load units from that data set. These represents target units.
			if (attrMap && attrMap[currentNormAttrSet] && attrMap[currentNormAttrSet][currentNormAttr]) {
				normAttrUnits = attrMap[currentNormAttrSet][currentNormAttr].units;
			}

			if (currentNorm=='area') { // area is by default in m2
				attrUnits = normalizationUnits || 'm2';
				normAttrUnits = null;
			}

			units = new Units();
			factor = units.translate(attrUnits, normAttrUnits, percentage);
			logger.info('data/data#getData Factor: ', factor, ' Attr units: ', attrUnits, ' Norm Attr Units ', normAttrUnits);

			// How do you count factor of difference? The source data set is in one unit.

			if (currentNorm == 'area') {
				norm = normPre + '"area"';
			}
			if (currentNorm == 'attribute') {
				normAttrName = 'as_' + currentNormAttrSet + '_attr_' + currentNormAttr;
				norm = normPre + '"' + normAttrName + '"';
			}
			// If normalization is over attribute set.
			if (currentNorm == 'attributeset') {
				normAttrName = 'as_' + currentNormAttrSet + '_attr_' + attr.attr;
				norm = normPre + '"' + normAttrName + '"';
			}
			if (currentNorm == 'year') {
				normAttrName = 'as_' + attr.as + '_attr_' + attr.attr;
				norm = normPre + '"' + normAttrName + '"';
			}
			if (topAll) {
				if (!topAllMap[attrName]) {
					topAllMap[attrName] = true;
					topAllSql += ',' + attrName;
				}
				if (normAttrName && !topAllMap[normAttrName]) {
					topAllMap[normAttrName] = true;
					topAllSql += normAttrName ? (',' + normAttrName) : '';
				}

			}
			if (params['useAggregation'] || topAll) {
				if (norm) {
					select += ', CASE WHEN (SUM(' + norm + ')=0) THEN NULL ELSE SUM(' + pre + '"' + attrName + '") / SUM(' + norm + ')*100 END';
				} else {
					select += ',SUM(' + pre + '"' + attrName + '")';
				}
			} else {
				if (norm) {
					select += ', CASE WHEN (' + norm + '=0) THEN NULL ELSE ' + pre + '"' + attrName + '"::float / ' + norm + ' * '+factor+' END';
				} else {
					select += ',' + pre + '"' + attrName + '" * '+factor;
				}
			}
			select += ' AS ' + aliasAttrName + ' ';

		}
	}

	//console.log(select);
	if (anotherNormYear) {
		years.push(normalizationYear);
	}
	//console.log(select);
	var sql = '';

	var locationIds = [];
	var areaIds = [];

	var originalAreas = {};
	var originalSelected = {};
	for (var locationId in areas) {
		originalAreas[locationId] = {};
		locationIds.push(parseInt(locationId));
		for (var areaId in areas[locationId]) {
			areaIds.push(parseInt(areaId));
			originalAreas[locationId][areaId] = _.clone(areas[locationId][areaId]);
		}
	}

	for (var i = 0; i < selectedAreas.length; i++) {
		var selectedArea = selectedAreas[i];
		for (var locationId in selectedArea) {
			locationIds.push(parseInt(locationId));
			for (var areaId in selectedArea[locationId]) {
				areaIds.push(parseInt(areaId));
				originalSelected[locationId] = originalSelected[locationId] || {};
				originalSelected[locationId][areaId] = _.clone(selectedArea[locationId][areaId]);
				if (!params['noSelect']) {
					originalAreas[locationId] = originalAreas[locationId] || {};
					originalAreas[locationId][areaId] = _.clone(selectedArea[locationId][areaId]);
					if (areas[locationId] && areas[locationId][areaId] && areas[locationId][areaId].length && originalAreas[locationId][areaId].length){
						areas[locationId][areaId] = _.difference(areas[locationId][areaId],originalAreas[locationId][areaId]);
					}
				}
			}
		}
	}
	areaIds = _.uniq(areaIds);
	locationIds = _.uniq(locationIds);

	var allMap = selectedAreas;
	allMap.push(areas);
	var opts = {
		dataset: function(asyncCallback) {
			var filter = {featureLayers: areaIds[0]};
			crud.read('dataset', filter, function(err, resls) {
				if (err) {
					logger.error('data#getData Read dataset. Error: ', err);
					return callback(err);
				}
				if (!resls.length) {
					logger.error('data#getData Read dataset. No data set was returned. Filter: ', filter);
					return callback(new Error('nodataset'));
				}

				var selectedAt = resls[0].featureLayers[0];
				if (topAll) {
					var top = {'-1': {}};
					top['-1'][selectedAt] = true;
					allMap.splice(0, 0, top);
					if (areaIds.indexOf(selectedAt) < 0) {
						areaIds.push(selectedAt);
					}
					if (params['topall']) {
						originalAreas[-1] = {};
						originalAreas[-1][selectedAt] = true;
					}
				}
				if (!topLoc) {
					return asyncCallback(null, resls[0]);
				}
				if (areaIds.indexOf(selectedAt) < 0) {
					areaIds.push(selectedAt);
				}
				var top = {};
				for (var locationId in originalAreas) {
					if (locationId==-1) continue;
					if (areas[locationId] && areas[locationId][selectedAt]) {
						delete areas[locationId][selectedAt];
					}
					top[locationId] = top[locationId] || {};
					top[locationId][selectedAt] = true;
					if (params['toptree']) {
						originalAreas[locationId][selectedAt] = true;
					}
				}
				allMap.splice(topAll ? 1 : 0, 0, top);
				areaIds.reverse();
				return asyncCallback(null, resls[0]);
			})
		},
		location: ['dataset', function(asyncCallback, results) {
				if (!topAll) {
					return asyncCallback(null, null);
				}
				crud.read('location', {dataset: results.dataset._id}, function(err, resls) {
					if (err) {
						logger.error('data#getData Read location. Error: ', err);
						return callback(err);
					}
					for (var i = 0; i < resls.length; i++) {
						locationIds.push(resls[i]._id);
					}
					locationIds = _.uniq(locationIds);
					return asyncCallback(null, null);
				})
			}],
		layerRefMap: ['dataset', 'location', function(asyncCallback) {

				var dbFilter = {
					areaTemplate: {$in: areaIds},
					location: {$in: locationIds},
					year: {$in: years},
					isData: false
				};
				crud.read('layerref', dbFilter, function(err, resls) {
					if (err) {
						logger.error('data#getData Read layerref. Error: ', err);
						return callback(err);
					}
					if (!resls.length && areaIds.indexOf(-1) < 0) {
						logger.error('data#getData Read dataset. No data set was returned. Filter: ', dbFilter);
						return callback(new Error('notexistingdata (1)'));
					}
					var layerRefMap = {};
					for (var i = 0; i < resls.length; i++) {
						var layerRef = resls[i];
						if (!layerRef.fidColumn) {
							continue;
						}
						var location = layerRef.location;
						var areaTemplate = layerRef.areaTemplate;
						var year = layerRef.year;
						layerRefMap[location] = layerRefMap[location] || {};
						layerRefMap[location][areaTemplate] = layerRefMap[location][areaTemplate] || {};
						layerRefMap[location][areaTemplate][year] = layerRef;

					}
					return asyncCallback(null, layerRefMap);

				});
			}],
		sql: ['layerRefMap', 'dataset', function(asyncCallback, results) {
				for (var i = 0; i < allMap.length; i++) {
					var partailAreas = allMap[i];
					for (var locationId in partailAreas) {
						for (var areaId in partailAreas[locationId]) {


							var gids = partailAreas[locationId][areaId];
							if (!gids.length && gids !== true) continue;
							var oneSql = sql ? ' UNION (' : '(';
							var gidSql = '';
							var nameSql = '';
							if ((params['useAggregation'] && userAggregates[locationId] && userAggregates[locationId][areaId])) {
								var x = 0;
								for (var aggGid in userAggregates[locationId][areaId]) {
									var aggObj = userAggregates[locationId][areaId][aggGid];
									var aggGids = aggObj.gids;
									var aggName = aggObj.name;
									gidSql += 'CASE WHEN (x_' + years[0] + '."gid" IN (\'' + aggGids.join('\',\'') + "\')) THEN " + aggGid + ' ELSE ';
									nameSql += 'CASE WHEN (x_' + years[0] + '."gid" IN (\'' + aggGids.join('\',\'') + "\')) THEN '" + aggName + "' ELSE ";
									x++;
								}
								gidSql += 'x_' + years[0] + '."gid"';
								nameSql += 'x_' + years[0] + '."name"';
								if (gidSql) {
									for (var j = 0; j < x; j++) {
										gidSql += ' END';
										nameSql += ' END';
									}
								}

							}

							if (!gidSql) {
								gidSql = 'x_' + years[0] + '."gid"';
								nameSql = 'x_' + years[0] + '."name"';
							}
							var prIdx = (sort && sortProperty!='name') ? 1 : i;
							prIdx = ((aggSelect || (params['sortNorm'] && JSON.parse(params['sortNorm']).normType=='select')) && i==0) ? i : prIdx;
							oneSql += select.replace('%%at%%', areaId).replace('%%loc%%', locationId).replace('%%gid%%', gidSql).replace('%%name%%', nameSql).replace('%%pr%%',prIdx);

							var baseLayerRef = null;
							var baseYear = null;
							var atLeastOne = false;
							for (var j = 0; j < years.length; j++) {
								var year = years[j];
								var layerRef = null;
								try {
									layerRef = results.layerRefMap[locationId][areaId][year];
								}
								catch (e) {
								}
								if (!layerRef && locationId!=-1) {
									continue;
								}
								atLeastOne = true;
								//var layerName = areaId != -1 ? 'layer_' + layerRef['_id'] : ('layer_user_' + params['userId'] + '_loc_' + locationId + '_y_' + year);
								var tableSql = locationId == -1 ? getTopAllSql(topAllSql, results.layerRefMap, results.dataset, locationIds, year) : 'views.layer_' + layerRef['_id'];
								if (!baseLayerRef) {

									oneSql += ' FROM ' + tableSql + ' x_' + year;
									baseYear = year;
									baseLayerRef = layerRef;
								} else {
									oneSql += ' INNER JOIN ' + tableSql + ' x_' + year;
									oneSql += ' ON x_' + baseYear + '."gid" = x_' + year + '."gid"';
								}
							}
							if (!atLeastOne) {
								continue;
							}
							oneSql += ' WHERE 1=1';

							if (gids !== true) {
								oneSql += ' AND x_' + baseYear + '."gid" IN ';
								oneSql += '(\'' + gids.join('\',\'') + '\')';
							}
							if (params['useAggregation'] || topAll) {
								oneSql += ' GROUP BY 1,2,3,4'
							}
							oneSql += ')';
							sql += oneSql;
							//sql += ' ORDER BY name)';
						}
					}
				}
				return asyncCallback(null, sql);

			}],
		data: ['sql', function(asyncCallback, results) {
				var dataSql = 'SELECT gid,name,loc,at,pr,';
				dataSql += aliases.join(',');
				dataSql += ' FROM (' + results.sql + ') as a';
				dataSql += ' WHERE 1=1';
				dataSql += filterSql;
				var nameSort = 'name ASC';
				dataSql += ' ORDER BY ';
				if (sort && sortProperty=='name') {
					dataSql += 'pr ASC,' + sort[0].property + ' ' + sort[0].direction
				} else if (sort) {
					if (moreYears && sortProperty.search('y')<0) {
						sortProperty = sortProperty+'_y_'+years[0];
					}
					if (!moreYears && sortProperty.search('y')>=0) {
						sortProperty = sortProperty.split('_y_')[0];
					}
					dataSql += 'pr ASC,' + sortProperty + '_sort ' + sort[0].direction+','+nameSort;
				} else {
					dataSql += 'pr ASC,'+nameSort;
				}
				dataSql += (params['limit'] && !topAll && !topLoc) ? (' LIMIT ' + parseInt(params['limit'])) : '';
				dataSql += (params['start'] && !topAll && !topLoc) ? (' OFFSET ' + parseInt(params['start'])) : '';

				client.query(dataSql, function(err, resls) {
					logger.info('api/data#getData Sql query: ',dataSql,' Results of Sql Query: ', resls && resls.rows);
					if (err) {
						logger.error('data#getData Read dataset. Sql: ', sql, ' Error: ', err);
						return callback(new Error('notexistingdata (2)'));
					}
					var aggData = [];
					var normalData = [];
					var locAggDataMap = {};

					if (topLoc || topAll || aggSelect) {
						var aggColorPassed = false;
							//console.log(originalSelected);
						for (var i = 0; i < resls.rows.length; i++) {
							var row = resls.rows[i];

							if (row.loc == -1) {
								if (params['topall']) {
									normalData.push(row)
								}
								var aggRow = _.clone(row);
								aggData.push(aggRow);
								locAggDataMap[-1] = aggRow;
							} else if (topLoc && row.at == results.dataset.featureLayers[0]) {
								if (originalAreas[row.loc] && originalAreas[row.loc][row.at] && (originalAreas[row.loc][row.at] === true || originalAreas[row.loc][row.at].indexOf(row.gid) >= 0)) {
									normalData.push(row);
								}
								var aggRow = _.clone(row);
								aggData.push(aggRow);
								locAggDataMap[row.loc] = aggRow;

							} else if (aggSelect && defSelectedArea && defSelectedArea.at==row.at && defSelectedArea.loc==row.loc && defSelectedArea.gid==row.gid) {
								//if (originalAreas[row.loc] && originalAreas[row.loc][row.at] && (originalAreas[row.loc][row.at] === true || originalAreas[row.loc][row.at].indexOf(row.gid) >= 0)) {
									normalData.push(row);
								//}
								var aggRow = _.clone(row);
								aggData.push(aggRow);
								locAggDataMap['select'] = aggRow;

							} else {
								normalData.push(row);
							}
						}
						if (params['limit']) {
							var from = parseInt(params['start']) || 0;
							var to = from + (parseInt(params['limit']) || 0);
							normalData = normalData.slice(from, to);

						}

						if (params['normalization'] == 'toptree' || params['normalization'] == 'topall' || params['normalization'] == 'select') {
							for (var i = 0; i < normalData.length; i++) {
								var row = normalData[i];
								if (params['normalization'] == 'toptree') {
									var normRow = locAggDataMap[row.loc];

								} else if (params['normalization'] == 'select') {
									var normRow = locAggDataMap['select'];
								} else {
									var normRow = locAggDataMap[-1];
								}
								for (var j = 0; j < attrs.length; j++) {
									var attr = attrs[j];
									var attrName = 'as_' + attr.as + '_attr_' + attr.attr;
									for (var k = 0; k < years.length; k++) {
										var yearAttrName = years.length > 1 ? attrName + '_y_' + years[k] : attrName;
										var val = row[yearAttrName];
										val = val / normRow[yearAttrName] * 100;
										row[yearAttrName] = val;
									}
								}
							}
						}
					} else {
						normalData = resls.rows;
					}
					if (!normalData.length) return callback(new Error('nodata'));
					return asyncCallback(null, {normalData: normalData, aggData: aggData, aggDataMap: locAggDataMap});
				});
			}],
		total: ['sql', 'data', function(asyncCallback, results) {

				var aggregate = params['aggregate'];
				var aggregates = aggregate ? aggregate.split(',') : null;
				var aggData = results.data.aggData;
				//console.log(aliases)
				var totalSql = 'SELECT COUNT(*) as cnt';
				if (aggregates && aggregates[0] in {min: true, avg: true, max: true}) {
					for (var i = 0; i < aliases.length; i++) {
						var alias = aliases[i];
						for (var j = 0; j < aggregates.length; j++) {
							var aggr = aggregates[j];
							totalSql += ',' + aggr + '(' + alias + ') as ' + aggr + '_' + alias;
						}
					}
				}
				totalSql += ' FROM (SELECT * FROM (' + results.sql + ') as a';
				totalSql += ' WHERE 1=1';
				totalSql += filterSql;

				for (var i = 0; i < aggData.length; i++) {
					var row = aggData[i];
					if (originalAreas[row.loc] && originalAreas[row.loc][row.at] && (originalAreas[row.loc][row.at] === true || originalAreas[row.loc][row.at].indexOf(row.gid) >= 0)) {
						continue;
					}
					totalSql += ' AND (loc<>' + row.loc + ' OR at<>' + row.at + ' OR gid<>' + row.gid + ')';
				}
				totalSql += ') as b';
				client.query(totalSql, function(err, resls) {
					if (err) {
						logger.error('data#getData Read dataset. Sql: ', sql, " Error: ", err);
						return callback(err);
					}
					if ((params['normalization'] == 'toptree' || params['normalization'] == 'topall') && aggregates) {
						if (params['normalization'] == 'topall') {
							aggData = results.data.aggDataMap[-1];
						}
						else if (params['normalization'] == 'select') {
							aggData = results.data.aggDataMap['select'];
						}
						// v pripade toptree se bere pouze prvni lokalita
						else {
							for (var loc in results.data.aggDataMap) {
								if (loc != -1) {
									aggData = results.data.aggDataMap[loc];
									break;
								}
							}
						}

						for (var i = 0; i < aliases.length; i++) {
							var alias = aliases[i];
							for (var j = 0; j < aggregates.length; j++) {
								var aggr = aggregates[j];
								var val = resls.rows[0][aggr + '_' + alias];
								var normVal = aggData ? aggData[alias] / 100 : 1;
								var newVal = val / normVal;
								resls.rows[0][aggr + '_' + alias] = newVal;
							}
						}
					}
					return asyncCallback(null, resls.rows[0]);
				})
			}],
		res: ['data', 'total', 'sql', function(asyncCallback, results) {
				//console.log(results.data.normalData)
				var data = {
					data: results.data.normalData,
					aggData: results.data.aggData,
					aggDataMap: results.data.aggDataMap,
					total: results.total.cnt,
					aggregate: results.total
				};
				return callback(null, data);
			}]

	};

	return async.auto(opts);

}


function getAttrConf(params, callback) {


	var attrs = JSON.parse(params['attrs']);
	var attrSetIds = [];
	var attrIds = [];

	for (var i = 0; i < attrs.length; i++) {
		attrSetIds.push(attrs[i].as);
		attrIds.push(attrs[i].attr);
		if (attrs[i].normAs) {
			attrSetIds.push(attrs[i].normAs);
		}
		if (attrs[i].normAttr) {
			attrIds.push(attrs[i].normAttr);
		}
	}
	if (params['normalizationAttributeSet']) {
		attrSetIds.push(parseInt(params['normalizationAttributeSet']));
	}
	if (params['normalizationAttribute']) {
		attrIds.push(parseInt(params['normalizationAttribute']));
	}


	var opts = {
		attrSet: function(asyncCallback) {
			crud.read('attributeset', {_id: {$in: attrSetIds}}, function(err, resls) {
				var attrSetMap = {};
				if (err) {
					logger.error('data#getData Read attributeset. Error: ', err);
					return callback(err);
				}
				for (var i = 0; i < resls.length; i++) {
					var attrSet = resls[i];
					attrSetMap[attrSet._id] = attrSet;
				}
				return asyncCallback(null, attrSetMap);
			})
		},
		attr: function(asyncCallback) {
			crud.read('attribute', {_id: {$in: attrIds}}, function(err, resls) {
				var attrMap = {};
				if (err) {
					logger.error('data#getData Read attribute. Error: ', err);
					return callback(err);
				}
				for (var i = 0; i < resls.length; i++) {
					var attr = resls[i];
					attrMap[attr._id] = attr;
				}
				asyncCallback(null, attrMap);
			})
		},
		res: ['attr', 'attrSet', function(asyncCallback, results) {
				var attrMap = {};
				var prevAttrMap = {};
				var unitsArr = [];
				for (var i = 0; i < attrs.length; i++) {
					var attrRec = attrs[i];
					attrMap[attrRec.as] = attrMap[attrRec.as] || {};
					attrMap[attrRec.as][attrRec.attr] = _.clone(results.attr[attrRec.attr]);
					prevAttrMap[attrRec.as] = prevAttrMap[attrRec.as] || {};
					prevAttrMap[attrRec.as][attrRec.attr] = _.clone(results.attr[attrRec.attr]);
					var normType = attrRec.normType;
					var units = results.attr[attrRec.attr].units || '';
					var normUnits = null;

					if (normType == 'area') {
						normUnits = 'm2';
					}
					if (normType == 'year') {
						normUnits = units;
					}
					if (normType == 'select') {
						normUnits = units;
					}
					if (normType == 'attribute' || normType == 'attributeset') {
						var normAttr = attrRec.normAttr || attrRec.attr || params['normalizationAttribute'];
						var normAttrSet = attrRec.normAs || params['normalizationAttributeSet'];
						//console.log(normAttrSet,normAttr)
						if (normAttr && normAttrSet) {
							var normAttrRec = results.attr[normAttr];
							normUnits = normAttrRec.units || '';
							attrMap[normAttrSet] = attrMap[normAttrSet] || {};
							attrMap[normAttrSet][normAttr] = normAttrRec;
							prevAttrMap[normAttrSet] = prevAttrMap[normAttrSet] || {};
							prevAttrMap[normAttrSet][normAttr] = _.clone(normAttrRec);
						}
					}

					if (units == 'm2') {
						units = 'km2';
					}
					if (normUnits == 'm2') {
						normUnits = 'km2';
					}
					var unitsTotal = units.replace('2', '<sup>2</sup>') + (normUnits ? ('/' + normUnits.replace('2', '<sup>2</sup>')) : '');
					if (units == normUnits) {
						unitsTotal = '%';
					}
					attrMap[attrRec.as][attrRec.attr].units = unitsTotal;
					unitsArr.push(unitsTotal);
				}

				if (params['normalization'] == 'toptree' || params['normalization'] == 'topall' || params['normalization'] == 'select') {
					attrMap.units = '%';
					attrMap.unitsX = '%';
					attrMap.unitsY = '%';
					attrMap.unitsZ = '%';
				} else if (params['type'] == 'scatterchart') {

					attrMap.unitsX = unitsArr[0];
					attrMap.unitsY = unitsArr[1];
					attrMap.unitsZ = unitsArr.length > 2 ? unitsArr[2] : null;

				} else {
					attrMap.units = unitsArr[0];

				}
				callback(null, {attrMap: attrMap, attrSetMap: results.attrSet, prevAttrMap: prevAttrMap});
			}]
	};
	async.auto(opts);
}

var getTopAllSql = function(topAllSql, layerRefMap, dataset, locationIds, year) {
	locationIds = _.uniq(locationIds);
	var sql = '';
	var firstAt = dataset.featureLayers[0];
	for (var i = 0; i < locationIds.length; i++) {
		var locId = locationIds[i];
		var layerRef = null;
		try {
			layerRef = layerRefMap[locId][firstAt][year];
		}
		catch (e) {
		}
		if (!layerRef)
			continue;
		sql += sql ? ' UNION ' : '(';
		sql += topAllSql;
		sql += ' FROM views.layer_' + layerRef['_id']
	}
	sql += ')';
	return sql;
};


module.exports = {
	getData: getData,
	getAttrConf: getAttrConf
};



//    var areas = {
//        1: {
//            101: true,
//            102: [42,43,44]
//        },
//        2: {
//            101: true
//        }
//    }
//    var attrs = [
//        {as: 5, attr: 42},
//        {as: 5, attr: 62}
//    ]
//    var years = [1,2];
//    var normalization = 'attr';
//    var normalizationData = {as: 4, attr: 71}
//    normalization = 'attrset'
//    normalizationData = {as: 6};
//    normalization = 'area';
//    normalizationYear = 1;
