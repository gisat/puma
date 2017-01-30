var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;
var UUID = require('../common/UUID');
var json2csv = require('json2csv');
var json2xls = require('json2xls');
var _ = require('underscore');
var GeoJSON = require('geojson');
var Shapefile = require('shp-write');
var wellknown = require('wellknown');

var Conversion = require('../custom_features/GeometryConversion');

/**
 * It contains endpoints relevant for export of data.
 */
class ExportDrawingController {
    constructor(app, pgPool) {
        app.get('/drawingexport/json', this.geojson.bind(this));
        app.get('/drawingexport/shapefile', this.shapefile.bind(this));
        app.get('/drawingexport/xls', this.xls.bind(this));

        this._wgs84 = {
            name: "WGS84",
            projDef: "WGS84",
            epsg: "EPSG::4326"
        };
        this._webMercator = {
            name: "GOOGLE",
            projDef: "GOOGLE",
            epsg: "EPSG::3857"
        };

        this._webMercator2wgs84 = new Conversion({
            sourceCRSProjDef: this._webMercator.projDef,
            targetCRSProjDef: this._wgs84.projDef
        });
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
        var geoJson = this.getGeoJson(json, this._webMercator);

        response.set('Content-Type', 'application/json');
        response.set('Content-Disposition', this._contentDisposition(`${new UUID().toString()}.json`));
        response.end(JSON.stringify(geoJson), 'binary');
    }

    /**
     * It creates archive with shapefile and connected files and returns it to the caller.
     * @param request
     * @param response
     * @param next
     */
    shapefile(request, response, next){
        var json = JSON.parse(request.query.records);
        logger.error(`ExportDrawingController#xls Records: `, json.length);
        var geoJson = this.getGeoJson(json, this._wgs84);

        let zip = Shapefile.zip(geoJson, {folder: 'myshapes',
            types: {
                point: 'mypoints',
                polygon: 'mypolygons',
                line: 'mylines'
            }});
        // Save geojson into shapefile
        response.set('Content-Type', 'application/octet-stream');
        response.set('Content-Disposition', this._contentDisposition(`${new UUID().toString()}.zip`));
        response.end(zip, 'binary');
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

    /**
     * Get GeoJSON from JSON
     * @param json {Object}
     * @param {string} [crs] CRS proj4 definition of output
     * @returns {Object}
     */
    getGeoJson(json, crs){
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
            if (crs.name == "WGS84"){
                value.geometry = this._webMercator2wgs84.convertWKTGeometry(value.geometry, false);
            } else {
                value.geometry = wellknown(value.geometry);
            }
        });

        var crsDef = {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:" + crs.epsg
            }
        };

        return GeoJSON.parse(json, {GeoJSON: 'geometry', crs: crsDef});
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
