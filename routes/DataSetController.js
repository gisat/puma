var Controller = require('./Controller');
var MongoScopes = require('../metadata/MongoScopes');
var MongoScope = require('../metadata/MongoScope');

var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');
var config = require('../config');
var _ = require('underscore');

let Permission = require('../security/Permission');

/**
 * @augments Controller
 * @alias DatasetController
 * @param app
 * @constructor
 */
class DataSetController extends Controller {
	constructor(app, pool, schema) {
		super(app, 'dataset', pool, MongoScopes, MongoScope, schema);

		app.get('/restricted/rest/dataset', this.readRestricted.bind(this));
	}

	/**
	 * Verify that the user has rights to create Scopes
	 * @inheritDoc
	 */
	create(request, response, next) {
		if (!request.session.user.hasPermission(this.type, Permission.CREATE, null)) {
			response.status(403);
			return;
		}

		request.body.data.removedTools = ["2dmap", "scope"];

		super.create(request, response, next);
	}

	/**
	 * It is possible to use when you want more restricted access to the information. Usually used by all other applications than administration.
	 * @param request {Request} Request created by the Express framework.
	 * @param request.session.userId {Number} Id of the user who issued the request.
	 * @param response {Response} Response created by the Express framework.
	 * @param next {Function} Function to be called when we want to send it to the next route.
	 */
	async readRestricted(request, response, next) {
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
				response.data = result.filter(async scope => await this.hasRights(request.session.user, Permission.READ, scope._id));
				next();
			}
		});
	}

    async hasRights(user, method, id) {
        return user.hasPermission(this.type, method, id);
    }
}

module.exports = DataSetController;
