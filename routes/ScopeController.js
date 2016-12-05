var Controller = require('./Controller');
var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');
var config = require('../config');
var _ = require('underscore');

var MongoScopes = require('../metadata/MongoScopes');
var MongoScope = require('../metadata/MongoScope');

/**
 * @augments Controller
 * @alias ScopeController
 * @param app
 * @constructor
 */
class ScopeController extends Controller {
	constructor(app) {
		super(app, 'scope', MongoScopes, MongoScope);

		app.get('/restricted/rest/scope', this.readRestricted.bind(this));
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
				if(config.allowedUsers.indexOf(Number(request.userId)) == -1) {
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

module.exports = ScopeController;

// V 0.1
// Create PostgreSQL table containing rights. This table has three columns. userId, scopeId and type
// readRestricted for Scope and Place will take these information into account.

// V 1.0
// I will have the rights toward places and scopes. This means that I must somewhere store the information as a collection
// of SCOPE: userId / scopeId
// or PLACE: userId / placeId
// UserId is received with the requests. It is necessary to take these information into account.
// This information should be taken into account for all concepts and all operations. There are other types of metadata
// depending on the Scope and Place and these shouldn't be displayed either
