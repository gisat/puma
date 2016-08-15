var Controller = require('./Controller');
var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');

/**
 * @augments Controller
 * @alias DatasetController
 * @param app
 * @constructor
 */
var DatasetController = function(app) {
	Controller.call(this, app, 'dataset');

	app.get('/restricted/rest/dataset', this.readRestricted.bind(this));
};

DatasetController.prototype = Object.create(Controller.prototype);

/**
 * It is possible to use when you want more restricted access to the information. Usually used by all other applications than administration.
 * @param request {Request} Request created by the Express framework.
 * @param request.userId {Number} Id of the user who issued the request.
 * @param response {Response} Response created by the Express framework.
 * @param next {Function} Function to be called when we want to send it to the next route.
 */
DatasetController.prototype.readRestricted = function(request, response, next) {
	logger.info("Requested restricted collection of type: ", this.type, " By User: ", request.userId);

	var self = this;
	crud.readRestricted(this.type, {
		userId: request.userId,
		justMine: request.query['justMine']
	}, function (err, result) {
		if (err) {
			logger.error("It wasn't possible to read restricted collection:", self.type, " by User:", request.userId, " Error: ", err);
			next(err);
		} else {
			logger.info("Result of loading " + self.type + " " + result);
			response.data = result;
			next();
		}
	});
};

module.exports = DatasetController;