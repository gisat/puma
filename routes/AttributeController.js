var Controller = require('./Controller');
var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;

var AttributeController = function(app, pgPool, schema) {
	Controller.call(this, app, 'attribute');
};

AttributeController.prototype = Object.create(Controller.prototype);

AttributeController.prototype.read = function(request, response, next){
	logger.info('AttributeController#read Read filtered attributes.');

	var self = this;

	var params = {
		attr: request.params.id,
		attrSet: request.query.attrSet
	};

	var filter = {_id: parseInt(request.params.id)};

	crud.read(this.type, filter, {userId: request.userId, justMine: request.query['justMine']}, function (err, result) {
		if (err) {
			logger.error("It wasn't possible to read item: ", request.params.objId, " from collection:", self.type, " by User:", request.userId, " Error: ", err);
			return next(err);
		}

		result[0].attrSet = Number(params.attrSet);
		response.data = result;
		next();

	});
};

module.exports = AttributeController;