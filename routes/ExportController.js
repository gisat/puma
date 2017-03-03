var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;
var UUID = require('../common/UUID');
var wellknown = require('wellknown');
var json2csv = require('json2csv');
var json2xls = require('json2xls');
var _ = require('underscore');
var GeoJSON = require('geojson');
var Shapefile = require('shp-write');

var Info = require('../attributes/Info');
var Attributes = require('../attributes/Attributes');
var Conversion = require('../custom_features/GeometryConversion');

/**
 * It contains endpoints relevant for export of data.
 */
class ExportController {
    constructor(app, pgPool) {
        this._connection = conn.getMongoDb();
        this._info = new Info(pgPool);

        app.post('/export/json', this.selection2geojson.bind(this));
        app.post('/export/shp', this.selection2shapefile.bind(this));
        app.post('/export/csv', this.selection2csv.bind(this));
        app.post('/export/xls', this.selection2xls.bind(this));

        app.get('/drawingexport/json', this.drawing2geojson.bind(this));
        app.get('/drawingexport/shapefile', this.drawing2shapefile.bind(this));
        app.get('/drawingexport/xls', this.drawing2xls.bind(this));

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
     * It creates archive with shapefile and connected files and returns it to the caller.
     * @param request
     * @param response
     * @param next
     */
    drawing2shapefile(request, response, next){
        var json = JSON.parse(request.query.records);
        logger.error(`ExportDrawingController#xls Records: `, json.length);

        let geoJson = this.getGeoJsonFromDrawing(json, this._wgs84);
        let zip = Shapefile.zip(geoJson, {folder: 'custom_features',
            types: {
                point: 'mypoints',
                polygon: 'mypolygons',
                line: 'mylines'
            }});
        this.prepareShapefileExport(response, zip);
    }
    /**
     * It creates archive with shapefile and connected files and returns it to the caller.
     * @param request
     * @param response
     * @param next
     */
    selection2shapefile(request, response, next){
        var options = this.parseRequest(request.body);
        let attributesObj = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);

        var self = this;
        this._info.statistics(attributesObj, options.attributesMap, options.gids).then(json => {
            json.forEach(value => {
                value.geom = this._webMercator2wgs84.convertWKTGeometry(value.geom, false);
                value.attributes.forEach(attr => {
                    value[attr.name] = attr.value;
                });
                delete value.attributes;
            });

            let geoJson = this.constructor.getGeoJSON(json, this._wgs84, "geom");
            let zip = Shapefile.zip(geoJson, {folder: 'selected_units',
                types: {
                    point: 'mypoints',
                    polygon: 'mypolygons',
                    line: 'mylines'
                }});
            self.prepareShapefileExport(response, zip);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#info Error: `, err)
            )
        });
    }

    /**
     * It creates geojson and returns it to the caller.
     * @param request
     * @param response
     * @param next
     * @returns {*}
     */
    drawing2geojson(request, response, next) {
        let json = JSON.parse(request.query.records);
        logger.error(`ExportController#drawing2geojson Records: `, json.length);

        let geoJson = this.getGeoJsonFromDrawing(json, this._webMercator);
        this.prepareGeoJsonExport(response, geoJson);
    }

    /**
     * It creates geojson and returns it to the caller.
     * @param request
     * @param response
     * @param next
     * @returns {*}
     */
    selection2geojson(request, response, next) {
        var options = this.parseRequest(request.body);
        let attributesObj = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);

        var self = this;
        this._info.statistics(attributesObj, options.attributesMap, options.gids).then(json => {
            json.forEach(value => {
                value.geom = wellknown(value.geom);
                value.attributes.forEach(attr => {
                    value[attr.name] = attr.value;
                });
                delete value.attributes;
            });

            let geoJson = this.constructor.getGeoJSON(json, this._webMercator, "geom");
            self.prepareGeoJsonExport(response, geoJson);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#info Error: `, err)
            )
        });
    }

    /**
     * It creates CSV and returns it to the caler.
     * @param request
     * @param response
     * @param next
     * @returns {*}
     */
    selection2csv(request, response, next) {
        var options = this.parseRequest(request.body);

        let attributesObj = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._info.statistics(attributesObj, options.attributesMap, options.gids).then(json => {
            if(json.length > 0) {
                json.forEach(value => {
                    value.attributes.forEach(attr => {
                        value[attr.name] = attr.value;
                    });
                    delete value.attributes;
                    delete value.geom;
                });

                var csv = json2csv({ data: json, fields: Object.keys(json[0]) });
                response.set('Content-Type', 'text/csv');
                response.set('Content-Disposition', this.constructor.contentDisposition(`${new UUID().toString()}.csv`));
                response.end(csv, 'binary');
            } else {
                response.json({});
            }
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#info Error: `, err)
            )
        });
    }

    /**
     * It creates XLS and returns it to the caler.
     * @param request
     * @param response
     * @param next
     */
    selection2xls(request, response, next) {
        var options = this.parseRequest(request.body);

        let attributesObj = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        var self = this;
        this._info.statistics(attributesObj, options.attributesMap, options.gids).then(json => {
            if(json.length > 0) {
                json.forEach(value => {
                    value.attributes.forEach(attr => {
                        var units = "";
                        if (attr.hasOwnProperty("units") && attr.units != undefined && attr.units.length > 0){
                            units = " (" + attr.units + ") ";
                        }
                        var id = attr.name + units + " (" + attr.asName + ") ";
                        value[id] = attr.value;
                    });
                    delete value.attributes;
                    delete value.geom;
                });

                self.prepareXlsExport(response, json);
            } else {
                response.json({});
            }
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#info Error: `, err)
            )
        });
    }

    /**
     * It creates xls and returns it to the caller.
     * @param request
     * @param response
     * @param next
     * @returns {*}
     */
    drawing2xls(request, response, next) {
        var json = JSON.parse(request.query.records);
        logger.error(`ExportDrawingController#xls Records: `, json.length);

        json.forEach(value => {
            if (value.hasOwnProperty("scope")){
                delete value.scope;
            }
            if (value.hasOwnProperty("place")){
                delete value.place;
            }
            if (value.hasOwnProperty("olid")){
                delete value.olid;
            }
            if (value.hasOwnProperty("user_name")){
                delete value.user_name;
            }
        });
        this.prepareXlsExport(response, json);
    }

    /**
     * Get GeoJSON from JSON
     * @param json {Object}
     * @param {string} [crs] CRS proj4 definition of output
     * @returns {Object}
     */
    getGeoJsonFromDrawing(json, crs){
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
            if (value.hasOwnProperty("olid")){
                delete value.olid;
            }
            if (crs.name == "WGS84"){
                value.geometry = this._webMercator2wgs84.convertWKTGeometry(value.geometry, false);
            } else {
                value.geometry = wellknown(value.geometry);
            }
        });
        return this.constructor.getGeoJSON(json, crs, "geometry");
    }

    prepareShapefileExport(response, zip){
        response.set('Content-Type', 'application/octet-stream');
        response.set('Content-Disposition', this.constructor.contentDisposition(`${new UUID().toString()}.zip`));
        response.end(zip, 'binary');
    }

    /**
     * It prepares export of GeoJSON
     * @param response
     * @param geoJson {Object}
     */
    prepareGeoJsonExport (response, geoJson){
        response.set('Content-Type', 'application/json');
        response.set('Content-Disposition', this.constructor.contentDisposition(`${new UUID().toString()}.json`));
        response.end(JSON.stringify(geoJson), 'binary');
    }

    /**
     * It prepares export of GeoJSON
     * @param response
     * @param json {Object}
     */
    prepareXlsExport (response, json){
        var xls = json2xls(json);
        response.set('Content-Type', 'text/xls');
        response.set('Content-Disposition', this.constructor.contentDisposition(`${new UUID().toString()}.xls`));
        response.end(xls, 'binary');
    }

    /**
     * Get GeoJSON from JSON
     * @param json {Object}
     * @param crs {String} epsg code of CRS
     * @param nameOfGeomColumn {String} name of a key, where geometry is stored
     * @private
     */
    static getGeoJSON(json, crs, nameOfGeomColumn){
        var crsDef = {
            "type": "name",
            "properties": {
                "name": "urn:ogc:def:crs:" + crs.epsg
            }
        };
        return GeoJSON.parse(json, {GeoJSON: nameOfGeomColumn, crs: crsDef});
    }

    /**
     *
     * @param filename {string}
     * @returns {string}
     */
    static contentDisposition(filename) {
        var ret = 'attachment';
        if (filename) {
            // if filename contains non-ascii characters, add a utf-8 version ala RFC 5987
            ret = /[^\040-\176]/.test(filename)
                ? 'attachment; filename="' + encodeURI(filename) + '"; filename*=UTF-8\'\'' + encodeURI(filename)
                : 'attachment; filename="' + filename + '"';
        }
        return ret;
    }

    parseRequest(data) {
        var attr = JSON.parse(data.attributes);
        var areas = JSON.parse(data.gids);
        var per = JSON.parse(data.periods);
        var locations = JSON.parse(data.places);

        let attributes = _.toArray(attr);
        let gids = _.toArray(areas);
        let periods = _.toArray(per);
        let places = _.toArray(locations);

        logger.info('ExportController#parseRequest periods', periods);

        var attributesMap = {};
        attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );
        return {
            attributes: attributes,
            attributesMap: attributesMap,
            areaTemplate: Number(data.areaTemplate),
            gids: gids,
            periods: periods.map(period => Number(period)),
            places: places.map(place => Number(place))
        };
    }
}

module.exports = ExportController;