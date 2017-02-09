var logger = require('../common/Logger').applicationWideLogger;

var wellknown = require('wellknown');
var proj4 = require('proj4');

/**
 * Class for converting geometries from one projection to another one
 */
class GeometryConversion {
    /**
     * @param options {Object}
     * @param options.sourceCRSProjDef {string} proj4 definiton of source projection
     * @param options.targetCRSProjDef {string} proj4 definiton of target projection
     * @constructor
     */
    constructor (options) {
        this._sourceCRSProjDef = options.sourceCRSProjDef;
        this._targetCRSProjDef = options.targetCRSProjDef;
    }

    /**
     * Convert line in WKT format to target projection
     * @param wktGeometry {string} WKT geometry in original projection
     * @param toWKT {boolean} true, if output should be in WKT format
     * @returns {string|Object} WKT geometry in target projection/JSON
     */
    convertWKTGeometry (wktGeometry, toWKT){
        let geojson = this.constructor.extractPoints(wktGeometry);
        let points = geojson.coordinates;
        let geometryType = geojson.type;

        // library doesn't work for multipolygons
        if (geometryType == "MultiPolygon"){
            geometryType = "Polygon";
        }

        let convertedPoints = this.convertPoints(points);

        if (!toWKT){
            return {
                coordinates: convertedPoints,
                type: geometryType
            };
        }

        return this.constructor.geojsonToWKT(convertedPoints, geometryType);
    }

    /**
     * Convert point to target CRS
     * @param point {Array} point in original CRS
     * @returns {Array} point in target CRS
     */
    convertPoint (point){
        return proj4(this._sourceCRSProjDef, this._targetCRSProjDef, point);
    }

    /**
     * Convert list of points to target CRS (polygons are nested, multipolygons are nested again)
     * @param points {Array} list of points in original CRS
     * @returns {Array} list of points in target CRS
     */
    convertPoints (points){
        var convertedPoints = [];
        points.map(point => {
            if (point.length == 2){
                var converted = this.convertPoint(point);
                convertedPoints.push(converted);
            }
            // nested polygons
            else {
                point.map(coord => {
                    if (coord.length == 2){
                        var converted = this.convertPoint(coord);
                        convertedPoints.push(converted);
                    }
                    // nested multipolygons
                    else {
                        coord.map(coord2 => {
                            var converted = this.convertPoint(coord2);
                            convertedPoints.push(converted);
                        });
                    }
                })
            }
        });
        return convertedPoints;
    }

    /**
     * Convert coordinates to WKT according to type
     * @param coordinates {Array} list of coordinates
     * @param type {string} type of geometry
     * @returns {string} WKT geometry
     */
    static geojsonToWKT (coordinates, type){
        let geojson = {
            coordinates: coordinates,
            type: type
        };

        return wellknown.stringify(geojson);
    }

    /**
     * Return list of points out of WKT geometry
     * @param wktGeometry {string} geometry in WKT format
     * @returns {{coordinates: {Array}, type: {string}}} coordinates and geometry type
     */
    static extractPoints (wktGeometry){
        let geojson = wellknown(wktGeometry);
        logger.info('Geometry Conversion#extractPoints Number of points: ', geojson.coordinates.length);
        logger.info('Geometry Conversion#extractPoints Type: ', geojson.type.length);

        return geojson;
    }
}

module.exports = GeometryConversion;