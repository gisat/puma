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
	constructor(app, pool) {
		super(app, 'dataset', pool, MongoScopes, MongoScope);

		app.get('/restricted/rest/dataset', this.readRestricted.bind(this));
	}

	/**
	 * Verify that the user has rights to create Scopes
	 * @inheritDoc
	 */
	create(request, response, next) {
		if (!request.session.user.hasPermission(this.type, 'POST', null)) {
			response.status(403);
			return;
		}

		super.create(request, response, next);
	}

	/**
	 * It is possible to use when you want more restricted access to the information. Usually used by all other applications than administration.
	 * @param request {Request} Request created by the Express framework.
	 * @param request.session.userId {Number} Id of the user who issued the request.
	 * @param response {Response} Response created by the Express framework.
	 * @param next {Function} Function to be called when we want to send it to the next route.
	 */
	readRestricted(request, response, next) {
		logger.info("Requested restricted collection of type: ", this.type, " By User: ", request.session.userId);

		crud.readRestricted(this.type, {
			userId: request.session.userId,
			justMine: request.query['justMine']
		}, (err, result) => {
			if (err) {
				logger.error("It wasn't possible to read restricted collection:", this.type, " by User:", request.session.userId, " Error: ", err);
				next(err);
			} else {
				logger.info("Result of loading " + this.type + " " + result);
				response.data = result.filter(scope => this.hasRights(request.session.user, 'GET', scope._id));
				next();
			}
		});
	}

    hasRights(user, method, id) {
        return user.hasPermission(this.type, method, id);
    }
}

module.exports = DataSetController;
