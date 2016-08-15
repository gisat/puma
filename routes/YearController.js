var Controller = require('./Controller');

var YearController = function(app) {
	Controller.call(this, app, 'year');
};

YearController.prototype = Object.create(Controller.prototype);

module.exports = YearController;