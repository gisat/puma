var Controller = require('./Controller');
let FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
let MongoDataView = require('../visualization/MongoDataView');
let Permission = require('../security/Permission');
let logger = require('../common/Logger').applicationWideLogger;

class DataViewController extends Controller {
	constructor(app, pool, mongoDb) {
		super(app, MongoDataView.collectionName(), pool);

        this._mongo = mongoDb;

        app.get('/rest/customview/delete', this.deleteDataview.bind(this));
        app.get('/rest/views', this.readInitialViews.bind(this));
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
            logger.error(`DataViewController#deleteDataview Error: `, err);
		});
    }

    readInitialViews(request, response) {
        this._filteredMongoViews = new FilteredMongoDataViews({}, this._mongo);

        this._filteredMongoViews.json().then(views => {
            let resultsWithRights = views
                .filter(element => this.hasRights(request.session.user, Permission.READ, element._id, element))
                .map(view => {
                    return {
                        _id: view._id,
                        conf: {
                            name: view.conf.name,
                            description: view.conf.description,
                            language: view.conf.language,

                            dataset: view.conf.dataset,
                            theme: view.conf.theme,
                            visualization: view.conf.visualization,
                            location: view.conf.location
                        }
                    }
                });

            response.json({data: resultsWithRights});
        }).catch(err => {
            logger.error(`DataViewController#readInitialViews Error: `, err);
        })
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