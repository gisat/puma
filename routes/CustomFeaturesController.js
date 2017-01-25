var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');

var FeatureToVectorLayer = require('../custom_features/FeatureToVectorLayer');
var GeometryConversion = require('../custom_features/GeometryConversion');
var LinesSourceTable = require('../custom_features/LinesSourceTable');

class CustomFeaturesController {
    constructor (app, pool) {
        this._pool = pool;
        this._linesSourceTable = new LinesSourceTable(this._pool, "custom_lines");

        app.post("/customfeatures/saveline", this.addLine.bind(this));
        app.post("/customfeatures/selectlines", this.selectLines.bind(this));
        app.post("/customfeatures/deleteline", this.deleteLine.bind(this));
    }

    /**
     * Add custom line
     * @param request
     * @param response
     */
    addLine (request, response){
        var data = request.body.data;

        this._linesSourceTable.insert(data).then(function(result){
            if (result.status == "OK"){
                response.send(result);
            } else {
                response.send({
                    status: "Error"
                })
            }
        });
    }

    /**
     * Get all custom lines
     * @param request
     * @param response
     */
    selectLines (request, response){
        var params = request.body;

        this._linesSourceTable.select(params).then(function(result){
            if (result.status == "OK"){
                response.send(result);
            } else {
                response.send({
                    status: "Error"
                })
            }
        });
    }

    /**
     * Delete custom line
     * @param request
     * @param response
     */
    deleteLine (request, response){
        var params = request.body;

        this._linesSourceTable.deleteRecord(params).then(function(result){
            if (result.status == "OK"){
                response.send(result);
            } else {
                response.send({
                    status: "Error"
                })
            }
        });
    }
}

module.exports = CustomFeaturesController;