var conn = require('../common/conn');
var crud = require('../rest/crud');
var async = require('async');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');
var Promise = require('promise');

function getData(params) {
    var filters = params['filtersReady'];
    var filterSQL = getFilterSQL(filters);

    return new Promise(function(resolve,reject){
        getLayerRefs(params).then(function(layerRefs){
            getAreas(layerRefs,filterSQL).then(function(result){
                var areas = result;
                //var areas = result[0];
                //for (var i = 1; i < result.length; i++){
                //    areas = areas.concat(result[i]);
                //}
                resolve(areas);
            })
        });
    })
}

/**
 * Bulid the WHERE part of SQL statement
 * @param filters {Array}
 * @returns {string}
 */
function getFilterSQL(filters){
    var filterSQL = '';
    filters.forEach(function(filter, index){
        filterSQL += ' AND ' + filter.field + filter.comparison + filter.value;
    });
    return filterSQL;
}

/**
 *
 * @param layerRefs
 * @param filterSQL
 */
function getAreas(layerRefs, filterSQL){
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
    getData: getData
};
