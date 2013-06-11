
var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var us = require('underscore')

function getData(params, callback) {

    var client = conn.getPgDb();

    var areas = JSON.parse(params['areas']);

    var attrs = JSON.parse(params['attrs']);
    var years = JSON.parse(params['years']);
    var normalization = params['normalization'] || null;
    //var normalizationData = params['normalizationData'] ? JSON.parse(params['normalizationData']) : null;
    var normalizationYear = params['normalizationYear'] ? parseInt(params['normalizationYear']) : null;
    var normalizationAttributeSet = params['normalizationAttributeSet'] ? parseInt(params['normalizationAttributeSet']) : null;
    var normalizationAttribute = params['normalizationAttribute'] ? parseInt(params['normalizationAttribute']) : null;



    var sort = params['sort'] ? JSON.parse(params['sort']) : [{property: 'name',direction:'ASC'}];
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
            case 'eq':
                compOperator = '=';
                break;
        }
        filterSql += ' AND ' + f.field + compOperator + f.value + (f.comparison ? '' : '%\'')
    }




    var layerRefMap = {};

    var select = "SELECT "
    var anotherNormYear = years.length == 1 && normalization && normalizationYear && years[0] != normalizationYear;
    var moreYears = years.length > 1;
    var aliases = [];
    for (var i = 0; i < years.length; i++) {
        var yearId = years[i];
        var pre = 'x_' + yearId + '.';
        var normPre = (anotherNormYear) ? ('x_' + normalizationYear + '.') : pre;
        select += i == 0 ? (pre + '"gid"') : '';
        select += i == 0 ? (',' + pre + '"name"') : '';
        select += i == 0 ? (',%%at%% AS at') : '';
        select += i == 0 ? (',%%loc%% AS loc') : '';
        for (var j = 0; j < attrs.length; j++) {
            var attr = attrs[j];
            var attrName = attr.area ? 'area' : ('as_' + attr.as + '_attr_' + attr.attr);
            var aliasAttrName = moreYears ? (attrName + '_y_' + yearId) : attrName;
            
            var norm = '';
            if (normalization == 'area') {
                norm = normPre + '"area"*100';
            }
            if (normalization == 'attribute') {
                var normAttrName = 'as_' + normalizationAttributeSet + '_attr_' + normalizationAttribute;
                norm = normPre + '"' + normAttrName + '"*100';
            }
            if (normalization == 'attributeset') {
                var normAttrName = 'as_' + normalizationAttributeSet + '_attr_' + attr.attr;
                norm = normPre + '"' + normAttrName + '"*100';
            }
            if (norm) {
                select += ', CASE WHEN ('+norm+'=0) THEN NULL ELSE ' + pre + '"' + attrName + '" / ' + norm+' END';
            }
            else {
                select += ',' + pre + '"' + attrName + '"';
            }
            
            select += ' AS ' + aliasAttrName + ' ';
            aliases.push(aliasAttrName);
        }
    }
    if (anotherNormYear) {
        years.push(normalizationYear)
    }

    var sql = '';

    var locationIds = [];
    var areaIds = [];
    for (var locationId in areas) {
        locationIds.push(parseInt(locationId));
        for (var areaId in areas[locationId]) {
            areaIds.push(parseInt(areaId));
        }
    }
    


    var opts = {
        topAt: function(asyncCallback) {
            var aggregate = params['aggregate'];
            var normalization = params['normalization']
            if ((aggregate != 'toptree' && normalization!='toptree')) {
                return asyncCallback(null, null);
            }
            crud.read('tree', {featureLayerTemplates: areaIds[0]}, function(err, resls) {
                if (err)
                    return callback(err);
                if (!resls.length) {
                    return asyncCallback(null, null);
                }
                var levels = resls[0].featureLayerTemplates;
                var selectedAt = levels[0];   
                var contained = false;
                for (var locationId in areas) {
                    if(areas[locationId][selectedAt]) {
                        contained = true;
                    }
                    else {
                        areas[locationId][selectedAt]=true;
                        areaIds.push(selectedAt);
                    }
                    break;
                    areaIds.reverse();
                }
                return asyncCallback(null, {contained:contained,location:locationId,at:selectedAt});
            })
        },
        layerRefMap: ['topAt',function(asyncCallback) {
            
            var dbFilter = {
                areaTemplate: {$in: areaIds}, location: {$in: locationIds}, year: {$in: years}, isData: false
            }
            crud.read('layerref', dbFilter, function(err, resls) {
                if (err)
                    return callback(err);
                if (!resls.length && areaIds.indexOf(-1)<0) {
                    return callback(new Error('notexistingdata'));
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

            })
        }],
        sql: ['layerRefMap', function(asyncCallback, results) {
                for (var locationId in areas) {
                    for (var areaId in areas[locationId]) {
//                    for (var i=0;i<areaIds.length;i++) {
//                        var areaId = areaIds[i];
//                        if (!areas[locationId][areaId])
                        
                    
                        var gids = areas[locationId][areaId];
                        sql += sql ? ' UNION ' : '';

                        sql += select.replace('%%at%%', areaId).replace('%%loc%%', locationId);
                        var baseLayerRef = null;
                        var baseYear = null;
                        for (var i = 0; i < years.length; i++) {
                            var year = years[i];
                            var layerRef = null;
                            try {
                                layerRef = results.layerRefMap[locationId][areaId][year];
                            }
                            catch(e) {}
                            
                            var layerName = areaId!=-1 ? 'layer_'+layerRef['_id'] : ('layer_user_'+params['userId']+'_loc_'+locationId+'_y_'+year);
                            if (!baseLayerRef) {
                                sql += ' FROM views.' +layerName+ ' x_' + year;
                                baseYear = year;
                                baseLayerRef = layerRef;
                            }
                            else {
                                sql += ' LEFT JOIN views.' +layerName+ ' x_' + year;
                                sql += ' ON x_' + baseYear + '."gid" = x_' + year + '."gid"';
                            }
                        }
                        sql += ' WHERE 1=1';
                        if (gids !== true) {
                            sql += ' AND x_' + baseYear + '."gid" IN ';
                            sql += '(' + gids.join(',') + ')';
                        }
                        
                    }
                }
                return asyncCallback(null, sql);

            }],
        data: ['sql', function(asyncCallback, results) {
                var dataSql = 'SELECT * FROM (' + results.sql + ') as a';
                dataSql += ' WHERE 1=1';
                dataSql += filterSql;
                if (sort) {
                    dataSql += ' ORDER BY ' + sort[0].property + ' ' + sort[0].direction;
                }
                dataSql += (params['limit']&&!results.topAt) ? (' LIMIT ' + params['limit']) : '';
                dataSql += (params['start']&&!results.topAt) ? (' OFFSET ' + params['start']) : '';
                client.query(dataSql, function(err, resls) {
                    if (err)
                        return callback(err);
                    
                    var aggData = [];
                    var normalData = [];
                    
                    if (results.topAt) {
                        for (var i=0;i<resls.rows.length;i++) {
                            var row = resls.rows[i];
                            //console.log(row)
                            if (row.loc==results.topAt.location && row.at == results.topAt.at) {
                                if (results.topAt.contained || params['normalization']!='toptree') {
                                    
                                    normalData.push(row);
                                }
                                aggData.push(us.clone(row))
                            }
                            else {
                                normalData.push(row);
                            }
                        }
                        if (params['limit']) {
                            var from = parseInt(params['start'])||0;
                            var to = from + (parseInt(params['limit'])||0);
                            normalData = normalData.slice(from,to);

                        }
                        
                        
                        var normRow = aggData[0];
                        if (params['normalization'] == 'toptree') {
                            for (var i=0;i<normalData.length;i++) {
                                var row = normalData[i];
                                for (var j = 0; j < attrs.length; j++) {
                                    var attr = attrs[j];
                                    var attrName = 'as_' + attr.as + '_attr_' + attr.attr;
                                    for (var k = 0; k < years.length; k++) {
                                        var yearAttrName = years.length > 1 ? attrName + '_y_' + years[k] : attrName;
                                        var val = row[yearAttrName];
                                        val = val/normRow[yearAttrName]*100;
                                        row[yearAttrName] = val;
                                    }
                                }                            
                            }
                        }
                    }
                    else {
                        normalData = resls.rows;
                    }
                    
                    return asyncCallback(null, {normalData:normalData,aggData:aggData});
                })
            }],
        total: ['sql','data', function(asyncCallback, results) {

                var aggregate = params['aggregate'];               
                var aggregates = aggregate ? aggregate.split(',') : null;
                
                var totalSql = 'SELECT COUNT(*) as cnt';
                if (aggregates && aggregates[0] in {min: true,avg:true,max:true}) {
                    for (var i = 0; i < aliases.length; i++) {
                        var alias = aliases[i];
                        for (var j = 0; j < aggregates.length; j++) {
                            var aggr = aggregates[j];
                            totalSql += ',' + aggr + '(' + alias + ') as ' + aggr + '_'+alias;
                        }                   
                    }
                }
                totalSql += ' FROM (SELECT * FROM (' + results.sql + ') as a';
                totalSql += ' WHERE 1=1';
                totalSql += filterSql;
                if (results.topAt && !results.topAt.contained) {
                    totalSql += ' AND (loc<>'+results.topAt.location+' OR at<>'+results.topAt.at+')';
                }
                totalSql += ') as b'
                client.query(totalSql, function(err, resls) {
                    if (err)
                        return callback(err);
                    if (params['normalization']=='toptree' && aggregates) {
                        var aggData = results.data.aggData[0];
                        for (var i = 0; i < aliases.length; i++) {
                            var alias = aliases[i];
                            for (var j = 0; j < aggregates.length; j++) {
                                var aggr = aggregates[j];
                                var val = resls.rows[0][aggr+'_'+alias];
                                var normVal = aggData ? aggData[alias]/100 : 1;
                                var newVal = val / normVal;
                                resls.rows[0][aggr+'_'+alias] = newVal
                            }                   
                        }
                    }
                    return asyncCallback(null, resls.rows[0]);
                })
            }],
        res: ['data', 'total', 'sql', function(asyncCallback, results) {
                var data = {
                    data: results.data.normalData,
                    aggData: results.data.aggData,
                    total: results.total.cnt,
                    aggregate: results.total,
                    sql: results.sql
                }
                return callback(null, data);
            }]

    }

    return async.auto(opts);

}


function getAttrConf(params, callback) {


    var attrs = JSON.parse(params['attrs']);
    var attrSetIds = [];
    var attrIds = [];

    for (var i = 0; i < attrs.length; i++) {
        attrSetIds.push(attrs[i].as);
        attrIds.push(attrs[i].attr);
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
                if (err)
                    return callback(err);
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
                if (err)
                    return callback(err);
                for (var i = 0; i < resls.length; i++) {
                    var attr = resls[i];
                    attrMap[attr._id] = attr;
                }
                asyncCallback(null, attrMap);
            })
        },
        res: ['attr', 'attrSet', function(asyncCallback, results) {
                var attrMap = {};
                for (var i = 0; i < attrs.length; i++) {
                    var attrRec = attrs[i];
                    attrMap[attrRec.as] = attrMap[attrRec.as] || {};
                    attrMap[attrRec.as][attrRec.attr] = results.attr[attrRec.attr];
                }
                if (params['normalizationAttribute'] && params['normalizationAttributeSet']) {
                    var normAttrSet = params['normalizationAttributeSet'];
                    var normAttr = params['normalizationAttribute'];
                    attrMap[normAttrSet] = attrMap[normAttrSet] || {}
                    attrMap[normAttrSet][normAttr] = results.attr[normAttr];
                }
                var attr1 = attrMap[attrs[0].as][attrs[0].attr]
                var units1 = attr1.units || '';
                var normUnits = null;
                if (params['normalization'] == 'area') {
                    normUnits = 'm2'
                }
                if (params['normalization'] == 'attributeset') {
                    normUnits = units1
                }
                if (params['normalization'] == 'attribute') {
                    var normAttr = params['normalizationAttribute'];
                    var normAttrSet = params['normalizationAttributeSet']
                    if (normAttr && normAttrSet) {
                        var normAttrRec = attrMap[normAttrSet][normAttr]
                        normUnits = normAttrRec.units || '';
                    }

                }
                var units = units1 + (normUnits ? ('/' + normUnits) : '');
                if (units1 == normUnits) {
                    units = '%'
                }
                if (params['normalization'] == 'toptree') {
                    attrMap.units = '%';
                    attrMap.unitsX = '%';
                    attrMap.unitsY = '%';
                    attrMap.unitsZ = '%';
                }
                else if (params['type'] == 'scatterchart') {
                    var attr2 = attrMap[attrs[1].as][attrs[1].attr]
                    var units2 = attr2.units || '';
                    var units2Final = units2 + (normUnits ? ('/' + normUnits) : '');
                    if (units2 == normUnits) {
                        units2Final = '%'
                    }
                    var attr3 = null;
                    if (attrs.length > 2) {
                        var attr3 = attrMap[attrs[2].as][attrs[2].attr]
                        var units3 = attr3.units || '';
                        var units3Final = units3 + (normUnits ? ('/' + normUnits) : '');
                        if (units3 == normUnits) {
                            units3Final = '%'
                        }
                    }

                    attrMap.unitsX = units.replace('2', '<sup>2</sup>');
                    attrMap.unitsY = units2Final.replace('2', '<sup>2</sup>');
                    attrMap.unitsZ = attr3 ? units3Final.replace('2', '<sup>2</sup>') : null;
                    //attrMap.unitsX = '';
                    //attrMap.unitsY = '';
                }
                else {
                    attrMap.units = units.replace('2', '<sup>2</sup>');
                    //attrMap.units = ''
                }


                callback(null, {attrMap:attrMap,attrSetMap:results.attrSet});
            }]
    }
    async.auto(opts);
}


module.exports = {
    getData: getData,
    getAttrConf: getAttrConf
}



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
