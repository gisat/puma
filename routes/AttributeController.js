var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');

var Controller = require('./Controller');
var PgAttributes = require('../attributes/PgAttributes');
var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');

class AttributeController extends Controller {
	constructor(app, pgPool, schema) {
		super(app, 'attribute', MongoAttributes, MongoAttribute);
		this._pgAttributes = new PgAttributes(pgPool, schema);
	}

	read(request, response, next) {
		logger.info('AttributeController#read Read filtered attributes.');

		var self = this;

		var params = {
			attr: request.params.id,
			attrSet: request.query.attrSet,
			layer: request.query.layer
		};

		var filter = {_id: parseInt(request.params.id)};

		crud.read(this.type, filter, {userId: request.userId, justMine: request.query['justMine']}, function (err, result) {
			if (err) {
				logger.error("It wasn't possible to read item: ", request.params.objId, " from collection:", self.type, " by User:", request.userId, " Error: ", err);
				return next(err);
			}

			self._pgAttributes.all(params).then(function(attributes){

				result[0].maxValue = Number(attributes[0].max);
				result[0].minValue = Number(attributes[0].min);
				result[0].attrSet = Number(params.attrSet);

				response.data = result;
				next();
			});
		});
	}
}

module.exports = AttributeController;