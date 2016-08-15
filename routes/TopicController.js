var Controller = require('./Controller');

var TopicController = function(app) {
	Controller.call(this, app, 'topic');
};

TopicController.prototype = Object.create(Controller.prototype);

module.exports = TopicController;