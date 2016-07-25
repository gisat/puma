var Controller = require('./Controller');

var DatasetController = function(app) {
	Controller.call(this, app, 'dataset');
};

DatasetController.prototype = Object.create(Controller.prototype);

module.exports = DatasetController;