var dataMod = require('./data');
var fs = require('fs')
var async = require('async')
var crud = require('../rest/crud')
var us = require('underscore')
function getChart(params, callback) {

    var years = JSON.parse(params['years']);
    var attrs = JSON.parse(params['attrs']);
    var filters = params['activeFilters'] ? JSON.parse(params['activeFilters']) : [];
    var filterMap = {};
    for (var i = 0; i < filters.length; i++) {
        filterMap[filters[i].dataIndex] = filters[i].value
    }
    console.log(attrs);
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
                            minWidth: 120,
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
                            if (us.contains(dataIndexes,dataIndex)) {
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
                                text: results.years[year],
                                yearName: results.years[year],
                                fullName: fullName,
                                minWidth: 100,
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
    var fileName = 'tmp/' + generateId() + '.csv';
    var attrs = JSON.parse(params['attrs']);
    var years = JSON.parse(params['years']);
    params['limit'] = null;
    params['start'] = null;
    
    var opts = {
        
        data: ['attrConf',function(asyncCallback,results) {
            params.attrMap = results.attrConf.prevAttrMap;
            dataMod.getData(params, function(err, dataObj) {
                if (err)
                    return callback(err);
                //console.log(dataObj)
                return asyncCallback(null, dataObj);
            })
        }],
        attrConf: function(asyncCallback) {
                
                
                dataMod.getAttrConf(params, function(err, attrMap) {
                    if (err)
                        return callback(err);
                    
                    return asyncCallback(null, attrMap)
                })
            },
        yearMap: function(asyncCallback) {
            crud.read('year', {_id: {$in: years}}, function(err, resls) {
                if (err)
                    return callback(err);
                var yearMap = {};
                for (var i=0;i<resls.length;i++) {
                    yearMap[resls[i]._id] = resls[i];
                }
                return asyncCallback(null, yearMap)
            })
        },
        file: function(asyncCallback) {
            fs.open(fileName, 'w', asyncCallback);
        },
        result: ['data', 'attrConf','yearMap','file', function(asyncCallback, results) {
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
                        //firstRow += results.attrConf.attrSetMap[attr.as].name + '-';
                        firstRow += results.attrConf.attrMap[attr.as][attr.attr].name;
                        firstRow += ' '+results.yearMap[year].name+' ';
                        firstRow += normText+' ('
                        firstRow += results.attrConf.attrMap.units+')"';
                    }
                }
                fileText += firstRow + '\n';
                
                for (var i=0;i<data.length;i++) {
                    var row = data[i];
                    var rowText = row.gid+','+row.name;
                    for (var j=0;j<attrArray.length;j++) {
                        var attrName = attrArray[j];
                        rowText += ',';
                        rowText += row[attrName];
                    }
                    
                    fileText += rowText+'\n';
                }
                fs.writeFile(fileName,fileText,function(err) {
                    if (err)
                        return callback(err);
                    return callback(null,fileName);
                })

            }]
    }
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
