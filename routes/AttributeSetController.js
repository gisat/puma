var Controller = require('./Controller');
var MongoAttributeSets = require('../attributes/MongoAttributeSets');
var MongoAttributeSet = require('../attributes/MongoAttributeSet');

class AttributeSetController extends Controller {
	constructor(app) {
		super(app, 'attributeset', MongoAttributeSets, MongoAttributeSet);
	}
}

module.exports = AttributeSetController;