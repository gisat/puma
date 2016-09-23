var Controller = require('./Controller');
var MongoScopes = require('../metadata/MongoScopes');
var MongoScope = require('../metadata/MongoScope');

var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');
var config = require('../config');
var _ = require('underscore');

/**
 * @augments Controller
 * @alias DatasetController
 * @param app
 * @constructor
 */
class DataSetController extends Controller {
	constructor(app) {
		super(app, 'dataset', MongoScopes, MongoScope);

		app.get('/restricted/rest/dataset', this.readRestricted.bind(this));
	}

	/**
	 * It is possible to use when you want more restricted access to the information. Usually used by all other applications than administration.
	 * @param request {Request} Request created by the Express framework.
	 * @param request.userId {Number} Id of the user who issued the request.
	 * @param response {Response} Response created by the Express framework.
	 * @param next {Function} Function to be called when we want to send it to the next route.
	 */
	readRestricted(request, response, next) {
		logger.info("Requested restricted collection of type: ", this.type, " By User: ", request.userId);
		if(config.protectScopes) {
			if(config.allowedUsers && _.isArray(config.allowedUsers)) {
				if(config.allowedUsers.indexOf(request.userId) == -1) {
					return next();
				}
			}
		}

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
	}
}

module.exports = DataSetController;