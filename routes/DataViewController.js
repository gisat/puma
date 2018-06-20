var Controller = require('./Controller');
let FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
let MongoDataView = require('../visualization/MongoDataView');
const MongoDataViews = require('../visualization/MongoDataViews');
let Permission = require('../security/Permission');
let logger = require('../common/Logger').applicationWideLogger;

class DataViewController extends Controller {
	constructor(app, pool, mongoDb) {
		super(app, MongoDataView.collectionName(), pool);

        this._mongo = mongoDb;
        this._mongoDataViews = new MongoDataViews(mongoDb);

        app.get('/rest/customview/delete', this.deleteDataview.bind(this));
        app.get('/rest/views', this.readInitialViews.bind(this));

        app.post('/rest/initial/views', this.createInitialView.bind(this));
	}

	createInitialView(request, response) {
	    const scope = request.body.scope;
	    const place = request.body.place;
	    const theme = request.body.theme;
	    const period = request.body.period;

	    this._mongoDataViews.defaultForScope(scope, theme, place, period).then(() => {
	        response.send({"status": "ok"})
        }).catch(err => {
            response.status(500).send({
                "status": "err",
                "message": err
            })
        })
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
                        changed: view.changed,
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
            response.status(500).json({
                status: "Err"
            })
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