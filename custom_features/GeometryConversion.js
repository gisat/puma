var logger = require('../common/Logger').applicationWideLogger;

var wellknown = require('wellknown');
var proj4 = require('proj4');

/**
 * Class for converting geometries from one projection to another one
 */
class CustomFeaturesController {
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
     * @returns {string} WKT geometry in target projection
     */
    convertWKTLine (wktGeometry){
        let geojson = this.constructor.extractPoints(wktGeometry);
        let points = geojson.coordinates;
        let geometryType = geojson.type;

        let convertedPoints = this.convertPoints(points);

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
     * Convert list of points to target CRS
     * @param points {Array} list of points in original CRS
     * @returns {Array} list of points in target CRS
     */
    convertPoints (points){
        var convertedPoints = [];
        points.map(point => {
            var converted = this.convertPoint(point);
            convertedPoints.push(converted);
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

module.exports = CustomFeaturesController;