var Controller = require('./Controller');
var MongoAttributeSets = require('../attributes/MongoAttributeSets');
var MongoAttributeSet = require('../attributes/MongoAttributeSet');

class AttributeSetController extends Controller {
	constructor(app, pool) {
		super(app, 'attributeset', pool, MongoAttributeSets, MongoAttributeSet);
	}

    hasRights(user, method, id, object) {
        return user.hasPermission('topic', method, object.topic);
    }
}

module.exports = AttributeSetController;