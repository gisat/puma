var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');
var Promise = require('promise');

/**
 * Returns filtered areas
 * @param params
 * @returns {*|exports|module.exports}
 */
function getAreas(params) {
    var filters = params['filtersReady'];
    var filterSQL = getAreasFilterSQL(filters);

    return new Promise(function(resolve,reject){
        getLayerRefs(params).then(function(layerRefs){
            getAreasFromAllLayers(layerRefs,filterSQL).then(function(result){
                var areas = result;
                resolve(areas);
            })
        });
    })
}

/**
 * Returns unique values of given attribute
 * @param params
 * @returns {*|exports|module.exports}
 */
function getUniqueValues(params) {
    var attrs = JSON.parse(params['attrs'])[0];
    var column = "as_" + attrs.as + "_attr_" + attrs.attr;
    return new Promise(function(resolve,reject){
        getLayerRefs(params).then(function(layerRefs){
            getValuesFromAllLayers(layerRefs, column).then(function(result){
                var values = result[0];
                for (var i = 1; i < result.length; i++){
                    values = values.concat(result[i]);
                }
                resolve(values);
            })
        });
    })
}

/**
 * Bulid the WHERE part of SQL statement
 * @param filters {Array}
 * @returns {string}
 */
function getAreasFilterSQL(filters){
    var filterSQL = '';
    filters.forEach(function(filter){
        var value = filter.value;
        value = "\'" + value + "\'";
        filterSQL += ' AND ' + filter.field + filter.comparison + value;
    });
    return filterSQL;
}

/**
 * @param layerRefs
 */
function getValuesFromAllLayers(layerRefs, column){
    var values = [];
    layerRefs.forEach(function(layer){
        var selectSQL = "SELECT " + column + " as attr FROM views.layer_" + layer.id + " GROUP BY attr ORDER BY attr ASC";
        //var selectSQL = "SELECT " + column + " as attr, COUNT(" + column + ") as total FROM views.layer_" + layer.id + " GROUP BY attr";
        var prom = getValuesFromLayer(selectSQL, layer);
        values.push(prom);
    });
    return Promise.all(values);
}

function getValuesFromLayer(selectSQL, layer){
    var pg = conn.getPgDataDb();
    return new Promise(
        function(resolve, reject) {
            pg.query(selectSQL, function(err, results) {
                var values = [];
                results.rows.forEach(function(row){
                    values.push(row.attr);
                });
                resolve(values);
            });
        }
    );
}

/**
 *
 * @param layerRefs
 * @param filterSQL
 */
function getAreasFromAllLayers(layerRefs, filterSQL){
    var filteredAreas = [];
    layerRefs.forEach(function(layer){
        // WHERE 1=1 is for cases, when there is no attribute to filter
        var selectSQL = "SELECT * FROM views.layer_" + layer.id + " WHERE 1=1" + filterSQL;
        var prom = getAreasFromLayer(selectSQL, layer);
        filteredAreas.push(prom);
    });
    return Promise.all(filteredAreas);
}

function getAreasFromLayer(selectSQL, layer){
    var pg = conn.getPgDataDb();
    return new Promise(
        function(resolve, reject) {
            pg.query(selectSQL, function(err, results) {
                var areas = [];
                results.rows.forEach(function(row){
                    var area = {
                        gid: row.gid,
                        loc: layer.loc,
                        at: layer.at
                    };
                    areas.push(area);
                });
                resolve(areas);
            });
        }
    );
}

/**
 * It returns the promises of layerRef Ids
 * @param params {JSON}
 * @return Promise.all
 */
function getLayerRefs(params){
    var areas = JSON.parse(params['areas']);
    var attrs = JSON.parse(params['attrs']);
    var years = JSON.parse(params['years']);

    var layerRefs = [];
    for (var location in areas){
        for (var at in areas[location]){
            location = Number(location);
            at = Number(at);
            var mongoQueryParams = {
                location: location,
                areaTemplate: at,
                isData: false,
                year: years[0]
            };
            var prom = mongoRequest(mongoQueryParams);
            layerRefs.push(prom);
        }
    }
    return Promise.all(layerRefs);
}

/**
 *
 * @param mongoQueryParams
 * @returns {}
 */
function mongoRequest(mongoQueryParams){
    var mongo = conn.getMongoDb();

    return new Promise(
        function(resolve, reject) {
            mongo.collection('layerref').find(mongoQueryParams).toArray(function(err, items) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        id: items[0]._id,
                        loc: mongoQueryParams.location,
                        at: mongoQueryParams.areaTemplate
                    });
                }
            });
        }
    );
}

module.exports = {
    getAreas: getAreas,
    getUniqueValues: getUniqueValues
};
