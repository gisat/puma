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

	this._styles = new CompoundStyles({
		styles: [
			new PgStyles(pgPool, schema),
			new GeoserverStyles(pgPool, schema)
		]
	});
};

StyleController.prototype = Object.create(Controller.prototype);

/**
 * @inheritDoc
 */
StyleController.prototype.create = function(request, response, next) {
	var receivedData = request.body;
	if(!receivedData || !RestStyle.validateDescriptionCreation(receivedData.definition)) {
		response.send(400, 'Request must contain valid data for generating SLD.');
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
	var receivedData = request.body;

	if(!receivedData || !receivedData.uuid || !RestStyle.validateDescriptionUpdate(receivedData.definition)) {
		response.send(400, 'Request must contain valid data for generating SLD.');
		return;
	}

	var style = new RestStyle(receivedData.uuid, receivedData, request.userId);

	this._styles.update(style).then(function(){
		style.json().then(function(json){
			response.status(200).json(json);
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
StyleController.prototype.read = function(request, response, next) {

};

/**
 * @inheritDoc
 */
StyleController.prototype.delete = function(request, response, next) {

};

module.exports = StyleController;