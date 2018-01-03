var Controller = require('./Controller');
let MongoDataView = require('../visualization/MongoDataView');
let Permission = require('../security/Permission');

class DataViewController extends Controller {
	constructor(app, pool) {
		super(app, MongoDataView.collectionName(), pool);
	}

    hasRights(user, method, id) {
	    if(method ===  Permission.READ) {
            return user.hasPermission(this.type, method, id);
        } else {
	    	return true;
		}
    }
}

module.exports = DataViewController;