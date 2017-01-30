var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;
var UUID = require('../common/UUID');
var parse = require('wellknown');
var json2csv = require('json2csv');
var json2xls = require('json2xls');
var _ = require('underscore');
var GeoJSON = require('geojson');

var Info = require('../attributes/Info');
var Attributes = require('../attributes/Attributes');

/**
 * It contains endpoints relevant for export of data.
 */
class ExportDrawingController {
    constructor(app, pgPool) {
        app.get('/drawingexport/json', this.geojson.bind(this));
        app.get('/drawingexport/xls', this.xls.bind(this));
    }

    /**
     * It creates geojson and returns it to the caller.
     * @param request
     * @param response
     * @param next
     * @returns {*}
     */
    geojson(request, response, next) {
        var json = JSON.parse(request.query.records);
        logger.error(`ExportDrawingController#xls Records: `, json.length);

        json.forEach(value => {
            if (value.hasOwnProperty("scope")){
                delete value.scope;
            }
            if (value.hasOwnProperty("place")){
                delete value.place;
            }
            if (value.hasOwnProperty("user_name")){
                delete value.user_name;
            }
            value.geometry = parse(value.geometry);
        });

        var crs = {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:EPSG::3857"
            }
        };

        var geoJson = GeoJSON.parse(json, {GeoJSON: 'geometry', crs: crs});
        response.set('Content-Type', 'application/json');
        response.set('Content-Disposition', this._contentDisposition(`${new UUID().toString()}.json`));
        response.end(JSON.stringify(geoJson), 'binary');
    }

    /**
     * It creates xls and returns it to the caller.
     * @param request
     * @param response
     * @param next
     * @returns {*}
     */
    xls(request, response, next) {
        var json = JSON.parse(request.query.records);
        logger.error(`ExportDrawingController#xls Records: `, json.length);

        json.forEach(value => {
            if (value.hasOwnProperty("scope")){
                delete value.scope;
            }
            if (value.hasOwnProperty("place")){
                delete value.place;
            }
            if (value.hasOwnProperty("user_name")){
                delete value.user_name;
            }
        });

        var xls = json2xls(json);
        response.set('Content-Type', 'text/xls');
        response.set('Content-Disposition', this._contentDisposition(`${new UUID().toString()}.xls`));
        response.end(xls, 'binary');
    }

    _contentDisposition(filename) {
        var ret = 'attachment';
        if (filename) {
            // if filename contains non-ascii characters, add a utf-8 version ala RFC 5987
            ret = /[^\040-\176]/.test(filename)
                ? 'attachment; filename="' + encodeURI(filename) + '"; filename*=UTF-8\'\'' + encodeURI(filename)
                : 'attachment; filename="' + filename + '"';
        }

        return ret;
    }
}

module.exports = ExportDrawingController;
