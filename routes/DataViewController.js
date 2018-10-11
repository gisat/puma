const Controller = require('./Controller');
const FilteredMongoDataViews = require('../visualization/FilteredMongoDataViews');
const MongoDataView = require('../visualization/MongoDataView');
const MongoDataViews = require('../visualization/MongoDataViews');
const Permission = require('../security/Permission');
const logger = require('../common/Logger').applicationWideLogger;
const crud = require('../rest/crud');
const PgAnalyticalUnits = require('../layers/PgAnalyticalUnits');

class DataViewController extends Controller {
	constructor(app, pool, mongoDb) {
		super(app, MongoDataView.collectionName(), pool);

        this._mongo = mongoDb;
        this._mongoDataViews = new MongoDataViews(mongoDb);
        this._analyticalUnits = new PgAnalyticalUnits(pool);

        app.get('/rest/customview/delete', this.deleteDataview.bind(this));
        app.get('/rest/views', this.readInitialViews.bind(this));

        app.post('/rest/initial/views', this.createInitialView.bind(this));
	}

    createInitialView(request, response) {
	    const scope = request.body.scope;
        const place = request.body.place;
        const theme = request.body.theme;
        const period = request.body.period;
        logger.info(`DataViewController#createInitialView Scope: ${scope} Place: ${place} Theme: ${theme} Period: ${period}`);

        return this._mongoDataViews.defaultForScope(scope, theme, place, period, this._analyticalUnits).then(id => {
            return Promise.all([
                this.permissions.add(request.session.user.id, this.type, id, Permission.READ),
                this.permissions.add(request.session.user.id, this.type, id, Permission.UPDATE),
                this.permissions.add(request.session.user.id, this.type, id, Permission.DELETE)
            ]);
        }).then(() => {
            response.send({"status": "ok"});
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

            return this.permissions.forTypeCollection(this.type, resultsWithRights);
        }).then(resultsWithRights => {
            response.json({data: resultsWithRights});
        }).catch(err => {
            logger.error(`DataViewController#readInitialViews Error: `, err);
            response.status(500).json({
                status: "Err"
            })
        })
    }

    /**
     * @inheritDoc
     * This implementation returns also permissions for the relevant object.
     */
    read(request, response, next) {
        logger.info('DataViewController#read Read instance of type: ', this.type, ' By User: ', request.session.userId);

        var filter = {_id: parseInt(request.params.id)};
        var self = this;
        crud.read(this.type, filter, {
            userId: request.session.userId,
            justMine: request.query['justMine']
        }, (err, result) => {
            if (err || result.length === 0) {
                logger.error("It wasn't possible to read item: ", request.params.objId, " from collection:", self.type, " by User:", request.session.userId, " Error: ", err);
                return next(err);
            }

            if (!self.hasRights(request.session.user, Permission.READ, request.params.id, result)) {
                response.status(403);
                return;
            }

            this.permissions.forType(this.type, result[0]._id).then(permissions => {
                result[0].permissions = permissions;
                response.data = result;
                next();
            });
        });
    }

    /**
     * @inheritDoc
     * Add created permissions to the returned object.
     */
    create(request, response, next) {
        logger.info('Controller#create Create instance of type: ', this.type, ' By User: ', request.session.user.id);

        crud.create(this.type, request.body.data, {
            userId: request.session.user.id,
            isAdmin: response.locals.isAdmin
        }, (err, result) => {
            if (err) {
                logger.error("It wasn't possible to create object of type: ", this.type, " by User: ", request.session.user.id,
                    "With data: ", request.body.data, " Error:", err);
                return next(err);
            }

            Promise.all([
                this.permissions.add(request.session.user.id, this.type, result._id, Permission.READ),
                this.permissions.add(request.session.user.id, this.type, result._id, Permission.UPDATE),
                this.permissions.add(request.session.user.id, this.type, result._id, Permission.DELETE)
            ]).then(() => {
                return this.permissions.forType(this.type, result[0]._id);
            }).then(permissions => {
                result.permissions = permissions;
                response.data = result;
                next();
            }).catch(err => {
                logger.error("It wasn't possible to add permissions to the object of type: ", this.type, " by User: ", request.session.user.id,
                    "With data: ", request.body.data, " Error:", err);
                return next(err);
            });
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