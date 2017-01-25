var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');

var FeatureToVectorLayer = require('../custom_features/FeatureToVectorLayer');
var GeometryConversion = require('../custom_features/GeometryConversion');

class CustomFeaturesController {
    constructor (app, pool) {
        app.post("/customfeatures/line", this.addLine.bind(this));

        this._pgPool = pool;
    }

    addLine(req, res){
        var params = req.body.metadata;
        var data = req.body.data;

        logger.info('CustomFeaturesController#addLine original geometry:', data.geometry);

        if (config.hasOwnProperty("crs") && config.crs == "EPSG:3035"){
            this._geometryConversion = new GeometryConversion({
                sourceCRSProjDef: "EPSG:900913",
                targetCRSProjDef: "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +units=m +no_defs"
            });

            data.geometry = this._geometryConversion.convertWKTLine(data.geometry);
            logger.info('CustomFeaturesController#addLine geometry coverted to EPSG:3035', data.geometry);
        }

        data.geometry = this.constructor.convertToMultiLineString(data.geometry);
        logger.info('CustomFeaturesController#addLine geometry converted to MultiLineString', data.geometry);

        let featureToVecorLayer = new FeatureToVectorLayer(params, this._pgPool);
        featureToVecorLayer.addFeature(data).then(function(result){
            console.log(result);
            res.send({
                status: "OK"
            })
        });
    }

    /**
     * Check if geometry is multiLineString, else convert it
     * @param geometry {string} WKT geometry
     * @returns {string} WKT multiLineString
     */
    static convertToMultiLineString(geometry){
        var geomParts = geometry.split("(");
        var finalGeom = "MULTILINESTRING";

        if (geomParts[0] == "MULTILINESTRING"){
            return geometry;
        } else {
            return finalGeom + "((" + geomParts[1].slice(0,-1) + "))";
        }
    }
}

module.exports = CustomFeaturesController;