var Promise = require('promise');

var Controller = require('./Controller');
var RestStyle = require('../styles/RestStyle');
var CompoundStyles = require('../styles/CompoundStyles');
var PgStyles = require('../styles/PgStyles');
var GeoserverStyles = require('../styles/GeoserverStyles');
var UUID = require('../common/UUID');

/**
 * It represents a StyleController, which when created setup all necessary handlers for handling Styles. It supports creation, update and reading of the styles.
 * @constructor
 * @param {express} app Express application.
 * @augments Controller
 * @alias StyleController
 */
var StyleController = function(app, pgPool, schema){
	Controller.call(this, app, 'symbology');

	this._pgStyles = new PgStyles(pgPool, schema);
	this._styles = new CompoundStyles({
		styles: [
			this._pgStyles,
			new GeoserverStyles(pgPool, schema)
		]
	});
};

StyleController.prototype = Object.create(Controller.prototype);

/**
 * @inheritDoc
 */
StyleController.prototype.create = function(request, response, next) {
	var receivedData = request.body.data;
	if(!receivedData || !RestStyle.validateDescriptionCreation(receivedData.definition)) {
		response.status(400).json({
			message:'Request must contain valid data for generating SLD.'
		});
		return;
	}

	var style = new RestStyle(new UUID().toString(), receivedData, request.userId);

	this._styles.add(style).then(function(){
		style.json().then(function(json){
			response.status(201).json(json);
		});
	}, function(){
		next({
			message: 'Error in saving symbology.'
		});
	});
};

/**
 * @inheritDoc
 */
StyleController.prototype.update = function(request, response, next) {
	var receivedData = request.body.data;

	if(!receivedData || !receivedData.uuid || (receivedData.source != 'geoserver' && !RestStyle.validateDescriptionUpdate(receivedData.definition))) {
		response.status(400).json({
			message:'Request must contain valid data for generating SLD.'
		});
		return;
	}

	var style = new RestStyle(receivedData.uuid, receivedData, request.userId);

	var promiseOfUpdate;
	if(receivedData.source != 'geoserver') {
		// Means the style needs to be created and updated in the geoserver.
		promiseOfUpdate = this._styles.update(style);
	} else {
		// Handle geoserver data source.
		promiseOfUpdate = this._pgStyles.update(style);
	}

	promiseOfUpdate.then(function () {
		return style.json();
	}).then(function(json){
		response.status(200).json(json)
	}).catch(function(){
		next({
			message: 'Error in updating symbology.'
		})
	});
};

/**
 * @inheritDoc
 */
StyleController.prototype.readAll = function(request, response, next) {
	this._pgStyles.all().then(function(styles){
		var promises = [];

		styles.forEach(function(style){
			promises.push(style.json());
		});

		Promise.all(promises).then(function(results){
			response.status(200).json({data: results})
		});
	}, function(){
		next({
			message: 'Error in reading symbologies.'
		})
	});
};

/**
 * @inheritDoc
 */
StyleController.prototype.read = function(request, response, next) {
	this._pgStyles.all().then(function(styles){
		var promises = [];

		styles.forEach(function(style){
			promises.push(style.json());
		});

		Promise.all(promises).then(function(results){
			var found = false;

			results.forEach(function(result){ // TODO: Clean usage of the results.
				result = JSON.parse(result);
				if(result.uuid == request.params.id){
					found = true;
					response.status(200).json({data: result})
				}
			});

			if(!found){
				response.status(404).json({
					message: "Symbology with given uuid doesn't exist."
				});
			}
		});
	}, function(){
		next({
			message: 'Error in reading symbologies.'
		})
	});
};

/**
 * @inheritDoc
 */
StyleController.prototype.delete = function(request, response, next) {

};

module.exports = StyleController;