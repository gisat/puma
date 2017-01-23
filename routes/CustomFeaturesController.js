var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');

var FeatureToVectorLayer = require('../custom_features/FeatureToVectorLayer');

class DrawingController {
    constructor (app) {
        app.post("/customfeatures/line", this.addLine.bind(this));
    }

    addLine(req, res){
        var params = req.body.metadata;
        var data = req.body.data;

        let featureToVecorLayer = new FeatureToVectorLayer(params);
        featureToVecorLayer.addFeature(data).then(function(result){
            res.send({
                status: "OK"
            })
        });
    }
}

module.exports = DrawingController;