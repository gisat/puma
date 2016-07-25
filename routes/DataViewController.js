var Controller = require('./Controller');

var DataViewController = function(app) {
	Controller.call(this, app, 'dataview');
};

DataViewController.prototype = Object.create(Controller.prototype);

module.exports = DataViewController;