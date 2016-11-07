var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

var Controller = require('./Controller');
var RestStyle = require('../styles/RestStyle');
var CompoundStyles = require('../styles/CompoundStyles');
var PgStyles = require('../styles/PgStyles');
var GeoserverStyles = require('../styles/GeoserverStyles');
var MongoStyles = require('../styles/MongoStyles');
var Id = require('../common/Id');

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
	this._mongoStyles = new MongoStyles();
	this._styles = new CompoundStyles({
		styles: [
			this._pgStyles,
			new GeoserverStyles(pgPool, schema),
			this._mongoStyles
		]
	});
	this._withoutGeoserver = new CompoundStyles({
		styles: [
			this._pgStyles,
			this._mongoStyles
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

	// Use ids instead of uuids.
	var style;
	var self = this;
	new Id().toNumber().then(function(id){
		style = new RestStyle(id, receivedData, request.session.userId);
		return self._styles.add(style);
	}).then(function(){
		style.json().then(function(json){
			/*When new style is created in BO, BE send response in wrong format? Feature of bug?*/
			json = {data:json};
			response.status(201).json(json);
		});
	}).catch(function(error){
		logger.error('StyleController#create Error: ', error);
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
	// The BackOffice client expects _id instead of id.
	receivedData.id = receivedData._id;

	if(!receivedData || !receivedData.id || (receivedData.source != 'geoserver' && !RestStyle.validateDescriptionUpdate(receivedData.definition))) {
		response.status(400).json({
			message:'Request must contain valid data for generating SLD.'
		});
		return;
	}

	var style = new RestStyle(receivedData.id, receivedData, request.session.userId);

	var promiseOfUpdate;
	if(receivedData.source != 'geoserver') {
		// Means the style needs to be created and updated in the geoserver.
		promiseOfUpdate = this._styles.update(style);
	} else {
		// Handle geoserver data source.
		promiseOfUpdate = this._withoutGeoserver.update(style);
	}

	promiseOfUpdate.then(function () {
		return style.json();
	}).then(function(json){
		response.status(200).json(json)
	}).catch(function(error){
		logger.error('StyleController#update Error: ', error);
		next({
			message: 'Error in updating symbology.'
		})
	});
};

/**
 * @inheritDoc
 */
StyleController.prototype.readAll = function(request, response, next) {
	logger.info('StyleController#readAll Read all symbologies.');
	this._pgStyles.all().then(function(styles){
		logger.info('StyleController#readAll. Read all symbologies.');
		var promises = [];

		styles.forEach(function(style){
			promises.push(style.json());
		});

		return Promise.all(promises);
	}).then(function(results){
		logger.info('StyleController#readAll. Styles transformed to json.');
		response.status(200).json({data: results})
	}).catch(function(error){
		logger.error('StyleController#readAll Eror: ', error);
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
				if(result.id == request.params.id){
					found = true;
					response.status(200).json({data: result})
				}
			});

			if(!found){
				logger.warn('StyleController#read No symbology with id: ', request.params.id);
				response.status(404).json({
					message: "Symbology with given id doesn't exist."
				});
			}
		});
	}, function(error){
		logger.error('StyleController#read Error: ', error);
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
