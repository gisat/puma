var Controller = require('./Controller');

var AreaTemplate = function(app) {
	Controller.call(this, app, 'areatemplate');
};

AreaTemplate.prototype = Object.create(Controller.prototype);

module.exports = AreaTemplate;