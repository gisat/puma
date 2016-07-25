var Controller = require('./Controller');

var ThemeController = function(app) {
	Controller.call(this, app, 'theme');
};

ThemeController.prototype = Object.create(Controller.prototype);

module.exports = ThemeController;