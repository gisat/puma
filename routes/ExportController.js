var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;
var UUID = require('../common/UUID');
var parse = require('wellknown');
var json2csv = require('json2csv');
var _ = require('underscore');
var GeoJSON = require('geojson');

var Info = require('../attributes/Info');
var Attributes = require('../attributes/Attributes');

/**
 * It contains endpoints relevant for export of data.
 */
class ExportController {
    constructor(app, pgPool) {
        this._connection = conn.getMongoDb();

        this._info = new Info(pgPool);

        app.get('/export/geojson', this.geojson.bind(this));
        app.get('/export/csv', this.csv.bind(this));
    }

    /**
     * It creates geojson and returns it to the caller.
     * @param request
     * @param response
     * @param next
     * @returns {*}
     */
    geojson(request, response, next) {
        var options = this._parseRequest(request);

        let attributesObj = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._info.statistics(attributesObj, options.attributesMap, options.gids).then(json => {
            // geom is WKT - It must instead become the geojsonable something.
            // Here create Shapefile from the json.
            json.forEach(value => {
                value.geom = parse(value.geom);
            });

            var crs = {
                "type": "name",
                "properties": {
                    "name": "urn:ogc:def:crs:EPSG::3857"
                }
            };

            var geoJson = GeoJSON.parse(json, {GeoJSON: 'geom', crs: crs});
            response.set('Content-Type', 'application/json');
            response.set('Content-Disposition', this._contentDisposition(`${new UUID().toString()}.json`));
            response.end(JSON.stringify(geoJson), 'binary');
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
    csv(request, response, next) {
        var options = this._parseRequest(request);

        let attributesObj = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._info.statistics(attributesObj, options.attributesMap, options.gids).then(json => {
            if(json.length > 0) {
                var csv = json2csv({ data: json, fields: Object.keys(json[0]) });
                response.set('Content-Type', 'text/csv');
                response.set('Content-Disposition', this._contentDisposition(`${new UUID().toString()}.csv`));
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

    _parseRequest(request) {
        var attr = JSON.parse(request.query.attributes);
        var areas = JSON.parse(request.query.gids);

        let attributes = _.toArray(attr);
        let gids = _.toArray(areas);
        let periods = _.toArray(request.query.periods);
        let places = _.toArray(request.query.places);

        logger.info('ExportController#_parseRequest periods', periods);

        var attributesMap = {};
        attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );
        return {
            attributes: attributes,
            attributesMap: attributesMap,
            areaTemplate: Number(request.query.areaTemplate),
            gids: gids,
            periods: periods.map(period => Number(period)),
            places: places.map(place => Number(place))
        };
    }
}

module.exports = ExportController;