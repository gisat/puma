var Controller = require('./Controller');
let MongoDataView = require('../visualization/MongoDataView');
let Permission = require('../security/Permission');
let logger = require('../common/Logger').applicationWideLogger;

class DataViewController extends Controller {
	constructor(app, pool, mongoDb) {
		super(app, MongoDataView.collectionName(), pool);

        this._mongo = mongoDb;
        app.get('/rest/customview/delete', this.deleteDataview.bind(this));
	}

	deleteDataview(request, response, next){
        let dataview = Number(request.query.id);
        this._mongo.collection('dataview').remove({_id: dataview}).then(function(res){
        	if (res.result.n === 1){
                response.send({
                    status: "Ok"
                });
			} else {
                response.send({
                    status: "Error",
                    message: "Dataview does not exist"
                });
			}
        }).catch(err => {
            logger.error(`DataViewController#login Error: `, err);
		});
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