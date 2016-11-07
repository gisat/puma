var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');
var conn = require('../common/conn');

var Controller = require('./Controller');
var MongoThemes = require('../metadata/MongoThemes');
var MongoTheme = require('../metadata/MongoTheme');

/**
 * @augments Controller
 * @param app
 * @constructor
 */
class ThemeController extends Controller {
	constructor(app) {
		super(app, 'theme', MongoThemes, MongoTheme);
	}

	update(request, response, next) {
		logger.info("Create object of type: ", this.type, " by User: ", request.session.userId, "With data: ", request.body.data);

		var parameters = {
			userId: request.session.userId,
			isAdmin: response.locals.isAdmin
		};
		var theme = request.body.data;
		var self = this;
		crud.read('dataset', {_id: theme.dataset}, function(err, scopes){
			if (err) {
				logger.error("It wasn't possible to create object of type: ", self.type, " by User: ", request.session.userId,
					"With data: ", theme, " Error:", err);
				return next(err);
			}

			if(scopes.length > 1) {
				return next(new Error('Either multiple Scopes with the same Id or multiple Scopes specified for one Theme.'));
			} else if(scopes.length == 1) {
				// Use the years from associated Scope, if such Scope already exists. If it doesn't the years are handle by the frontend.
				theme.years = scopes[0].years;
			}

			crud.update(self.type, theme, parameters, function (err, result) {
				if (err) {
					logger.error("It wasn't possible to create object of type: ", self.type, " by User: ", request.session.userId,
						"With data: ", theme, " Error:", err);
					return next(err);
				} else {
					response.data = result;

					return next();
				}
			});
		});
	}
}

module.exports = ThemeController;
