var Controller = require('./Controller');
var Style = require('../styles/Style');
var UUID = require('../common/UUID');

/**
 * It represents a StyleController, which when created setup all necessary handlers for handling Styles. It supports creation, update and reading of the styles.
 * @constructor
 * @param {express} app Express application.
 * @augments Controller
 * @alias StyleController
 */
var StyleController = function(app){
	Controller.call(this, app, 'symbology');


};

StyleController.prototype = Object.create(Controller.prototype);

/**
 * @inheritDoc
 */
StyleController.prototype.create = function(request, response, next) {
	var receivedData = request.body.data;

	if(!receivedData || !Style.validateDescriptionCreation(receivedData.definition)) {
		response.send(400, 'Request must contain valid data for generating SLD.');
		return;
	}

	var style = new Style(new UUID().toString(), receivedData.definition);

	var sql = style.toSql();
	// Save to PostgreSQL;

	// Save to Mongo Database


	Promise.all([sqlPromise, mongoPromise]).then(function(){
		next();
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

	if(!receivedData || !Style.validateDescriptionUpdate(receivedData.definition)) {
		response.send(400, 'Request must contain valid data for generating SLD.');
		return;
	}

	var style = new Style(new UUID().toString(), receivedData);

	var sql = style.toSql();
	// Save to PostgreSQL;

	// Save to Mongo Database

	Promise.all([sqlPromise, mongoPromise]).then(function(){
		next();
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