var Controller = require('./Controller');
var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');

/**
 * @augments Controller
 * @param app
 * @constructor
 */
var ThemeController = function(app) {
	Controller.call(this, app, 'theme');
};

ThemeController.prototype = Object.create(Controller.prototype);

/**
 * @inheritDoc
 */
ThemeController.prototype.update = function(request, response, next) {
	// Whenever you create new theme also create associated topic, which must be used everywhere. What are the dependencies in the backend. In frontend it is relevant to associate correct years and stuff.
	logger.info("Create object of type: ", this.type, " by User: ", request.userId, "With data: ", request.body.data);

	var parameters = {
		userId: request.userId,
		isAdmin: request.isAdmin
	};
	var theme = request.body.data;
	var self = this;
	crud.read('dataset', {_id: theme.dataset}, function(err, scopes){
		if (err) {
			logger.error("It wasn't possible to create object of type: ", self.type, " by User: ", request.userId,
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
				logger.error("It wasn't possible to create object of type: ", self.type, " by User: ", req.userId,
					"With data: ", theme, " Error:", err);
				return next(err);
			} else {
				response.data = result;

				return next();
			}
		});
	});
};

module.exports = ThemeController;