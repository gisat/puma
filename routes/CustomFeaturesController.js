var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var request = require('request');
var Promise = require('promise');

var FeatureToVectorLayer = require('../custom_features/FeatureToVectorLayer');
var GeometryConversion = require('../custom_features/GeometryConversion');
var LinesSourceTable = require('../custom_features/LinesSourceTable');
var PolygonsSourceTable = require('../custom_features/PolygonsSourceTable');

class CustomFeaturesController {
    constructor (app, pool) {
        this._pool = pool;
        this._linesSourceTable = new LinesSourceTable(this._pool, "custom_lines");
        this._polygonsSourceTable = new PolygonsSourceTable(this._pool, "custom_polygons");

        app.post("/customfeatures/saveline", this.addLine.bind(this));
        app.post("/customfeatures/selectlines", this.selectLines.bind(this));
        app.post("/customfeatures/deleteline", this.deleteLine.bind(this));

        app.post("/customfeatures/savepolygon", this.addPolygon.bind(this));
        app.post("/customfeatures/selectpolygons", this.selectPolygons.bind(this));
        app.post("/customfeatures/deletepolygon", this.deletePolygon.bind(this));
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
     * Add custom polygon
     * @param request
     * @param response
     */
    addPolygon (request, response){
        var data = request.body.data;

        this._polygonsSourceTable.insert(data).then(function(result){
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
     * Get all polygons
     * @param request
     * @param response
     */
    selectPolygons (request, response){
        var params = request.body;

        this._polygonsSourceTable.select(params).then(function(result){
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

    /**
     * Delete custom polygon
     * @param request
     * @param response
     */
    deletePolygon (request, response){
        var params = request.body;

        this._polygonsSourceTable.deleteRecord(params).then(function(result){
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