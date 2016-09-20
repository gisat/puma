var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');
var conn = require('../common/conn');

/**
 * @alias Controller
 * @param app
 * @param type
 * @constructor
 */
var Controller = function (app, type, service, entity) {
	if (!app || !type) {
		throw new Error(
			logger.error('Controller#constructor The controller must receive valid type and app')
		);
	}

	this.type = type;
	this.set(app);
	if (service && entity) {
		this.service = new service(conn.getMongoDb());
		this.entity = entity;
	} else {
		logger.warn('Controller#constructor Service or entity wasn\'t specified');
	}
};

/**
 * This method sets all the relevant routes for this controller.
 * @private
 * @param app {express}
 */
Controller.prototype.set = function (app) {
	logger.info('Controller#set Preparing controller for type: ', this.type);
	app.put('/rest/' + this.type, this.update.bind(this));
	app.post('/rest/' + this.type, this.create.bind(this));
	app.get('/rest/' + this.type, this.readAll.bind(this));
	app.get('/rest/' + this.type + '/:id', this.read.bind(this));
	app.delete('/rest/' + this.type + '/:id', this.delete.bind(this));
	app.delete('/rest/' + this.type, this.deleteObject.bind(this));
};

/**
 * Default implementation of creation for rest objects. This implementation doesn't verifies anything. It simply creates the specified object.
 * @param request {Request} Request created by the Express framework.
 * @param request.body.data {Object} Payload for object, which should be updated.
 * @param request.userId {Number} Id of the user who issued the request.
 * @param request.isAdmin {Boolean} Whether the user is admin
 * @param response {Response} Response created by the Express framework.
 * @param next {Function} Function to be called when we want to send it to the next route.
 */
Controller.prototype.create = function (request, response, next) {
	logger.info('Controller#create Create instance of type: ', this.type, ' By User: ', request.userId);

	var self = this;
	crud.create(this.type, request.body.data, {
		userId: request.userId,
		isAdmin: request.isAdmin
	}, function (err, result) {
		if (err) {
			logger.error("It wasn't possible to create object of type: ", self.type, " by User: ", request.userId,
				"With data: ", request.body.data, " Error:", err);
			return next(err);
		}
		response.data = result;
		next();
	});
};

/**
 * Default implementation of reading of unique rest object. This implementation doesn't verifies anything. If the object doesn't exist, nothing is returned.
 * @param request {Request} Request created by the Express framework.
 * @param request.params.id {Number} Number representing the id of the object to read
 * @param request.userId {Number} Id of the user who issued the request.
 * @param response {Response} Response created by the Express framework.
 * @param next {Function} Function to be called when we want to send it to the next route.
 */
Controller.prototype.read = function (request, response, next) {
	logger.info('Controller#read Read instance of type: ', this.type, ' By User: ', request.userId);

	var filter = {_id: parseInt(request.params.id)};
	var self = this;
	crud.read(this.type, filter, {userId: request.userId, justMine: request.query['justMine']}, function (err, result) {
		if (err) {
			logger.error("It wasn't possible to read item: ", request.params.objId, " from collection:", self.type, " by User:", request.userId, " Error: ", err);
			return next(err);
		}
		response.data = result;
		next();
	});
};

/**
 * Default implementation of reading all rest objects in this collection. This implementation doesn't verifies anything. If the collection is empty, empty array is returned.
 * @param request {Request} Request created by the Express framework.
 * @param request.userId {Number} Id of the user who issued the request.
 * @param response {Response} Response created by the Express framework.
 * @param next {Function} Function to be called when we want to send it to the next route.
 */
Controller.prototype.readAll = function (request, response, next) {
	logger.info('Controller#readAll Read all instances of type: ', this.type, ' By User: ', request.userId);

	var filter = {};
	var self = this;
	crud.read(this.type, filter, {userId: request.userId, justMine: request.query['justMine']}, function (err, result) {
		if (err) {
			logger.error("It wasn't possible to read collection:", self.type, " by User: ", request.userId, " Error: ", err);
			return next(err);
		}
		response.data = result;
		next();
	});
};

/**
 * Default implementation of updating on rest object. This implementation doesn't verifies anything. Probably: The object is created if it didn't exist before
 * @param request {Request} Request created by the Express framework.
 * @param request.body.data {Object} Payload for object, which should be updated.
 * @param request.userId {Number} Id of the user who issued the request.
 * @param request.isAdmin {Boolean} Whether the user is admin
 * @param response {Response} Response created by the Express framework.
 * @param next {Function} Function to be called when we want to send it to the next route.
 */
Controller.prototype.update = function (request, response, next) {
	logger.info('Controller#update Update instance of type: ', this.type, ' By User: ', request.userId);

	var object = request.body.data;
	var self = this;
	crud.update(this.type, object, {userId: request.userId, isAdmin: request.isAdmin}, function (err, result) {
		if (err) {
			logger.error("It wasn't possible to update object of type: ", self.type, " by User: ", request.userId,
				"With data: ", request.body.data, " Error:", err);
			return next(err);
		}
		response.data = result;
		next();
	});
};

/**
 * Default implementation of deletion of rest object. This implementation doesn't verifies anything.
 * @param request {Request} Request created by the Express framework.
 * @param request.params.id {Number} Number representing the id of the object to read
 * @param request.userId {Number} Id of the user who issued the request.
 * @param request.isAdmin {Boolean} Whether the user is admin
 * @param response {Response} Response created by the Express framework.
 * @param next {Function} Function to be called when we want to send it to the next route.
 */
Controller.prototype.delete = function (request, response, next) {
	logger.info('Controller#delete Delete instance with id: ', request.params.id, ' of type: ', this.type, ' By User: ', request.userId);

	crud.remove(this.type, {_id: parseInt(request.params.id)}, {
		userId: request.userId,
		isAdmin: request.isAdmin
	}, function (err, result) {
		if (err) {
			return next(err);
		}
		next();
	});
};

// Default way to delete object.
Controller.prototype.deleteObject = function (request, response, next) {
	logger.info('Controller#deleteObject Delete instance with id: ',request.body.data._id,' of type: ', this.type, ' By User: ', request.userId);
	request.params.id = request.body.data._id;
	this.delete(request, response, next);
};

module.exports = Controller;