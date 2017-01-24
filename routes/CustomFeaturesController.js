var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');

var FeatureToVectorLayer = require('../custom_features/FeatureToVectorLayer');

class CustomFeaturesController {
    constructor (app, pool) {
        app.post("/customfeatures/line", this.addLine.bind(this));

        this._pgPool = pool;
    }

    addLine(req, res){
        var params = req.body.metadata;
        var data = req.body.data;

        data.geometry = this.constructor.convertToMultiLineString(data.geometry);
        logger.info('CustomFeaturesController#addLine data.geometry', data.geometry);

        let featureToVecorLayer = new FeatureToVectorLayer(params, this._pgPool);
        featureToVecorLayer.addFeature(data).then(function(result){
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