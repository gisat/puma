var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');
var conn = require('../common/conn');
let Promise = require('promise');

let config = require('../config');
let PgPermissions = require('../security/PgPermissions');
let Permission = require('../security/Permission');

/**
 * @alias Controller
 * @param app
 * @param type
 * @constructor
 */
class Controller {
    constructor(app, type, pool, service, entity, schema) {
        if (!app || !type) {
            throw new Error(
                logger.error('Controller#constructor The controller must receive valid type and app')
            );
        }

        this.permissions = new PgPermissions(pool, schema || config.postgreSqlSchema);
        this.type = type;
        this.set(app);
        if (service && entity) {
            this._connection = conn.getMongoDb();
            this.service = new service(this._connection);
            this.entity = entity;
        } else {
            logger.warn('Controller#constructor Service or entity wasn\'t specified');
        }
    }

    /**
     * This method sets all the relevant routes for this controller.
     * @private
     * @param app {express}
     */
    set(app) {
        logger.info('Controller#set Preparing controller for type: ', this.type);
        app.put('/rest/' + this.type, this.update.bind(this));
        app.post('/rest/' + this.type, this.create.bind(this));
        app.get('/rest/' + this.type, this.readAll.bind(this));
        app.get('/rest/' + this.type + '/:id', this.read.bind(this));
        app.delete('/rest/' + this.type + '/:id', this.delete.bind(this));
        app.delete('/rest/' + this.type, this.deleteObject.bind(this));
    }

    /**
     * Default implementation of creation for rest objects. This implementation doesn't verify anything. It simply creates the specified object.
     * @param request {Request} Request created by the Express framework.
     * @param request.body.data {Object} Payload for object, which should be updated.
     * @param request.session.user.id {Number} Id of the user who issued the request.
     * @param response.locals.isAdmin {Boolean} Whether the user is admin
     * @param response {Response} Response created by the Express framework.
     * @param next {Function} Function to be called when we want to send it to the next route.
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
                response.data = result;
                next();
            }).catch(err => {
                logger.error("It wasn't possible to add permissions to the object of type: ", this.type, " by User: ", request.session.user.id,
                    "With data: ", request.body.data, " Error:", err);
                return next(err);
            });
        });
    }

    /**
     * Default implementation of reading of unique rest object. This implementation doesn't verifies anything. If the object doesn't exist, nothing is returned.
     * @param request {Request} Request created by the Express framework.
     * @param request.params.id {Number} Number representing the id of the object to read
     * @param request.session.userId {Number} Id of the user who issued the request.
     * @param response {Response} Response created by the Express framework.
     * @param next {Function} Function to be called when we want to send it to the next route.
     */
    read(request, response, next) {
        logger.info('Controller#read Read instance of type: ', this.type, ' By User: ', request.session.userId);

        var filter = {_id: parseInt(request.params.id)};
        var self = this;
        crud.read(this.type, filter, {
            userId: request.session.userId,
            justMine: request.query['justMine']
        }, function (err, result) {
            if (err) {
                logger.error("It wasn't possible to read item: ", request.params.objId, " from collection:", self.type, " by User:", request.session.userId, " Error: ", err);
                return next(err);
            }

            if (!self.hasRights(request.session.user, Permission.READ, request.params.id, result)) {
                response.status(403);
                return;
            }

            response.data = result;
            next();
        });
    }

    /**
     * Default implementation of reading all rest objects in this collection. This implementation doesn't verifies anything. If the collection is empty, empty array is returned.
     * @param request {Request} Request created by the Express framework.
     * @param request.session.userId {Number} Id of the user who issued the request.
     * @param response {Response} Response created by the Express framework.
     * @param next {Function} Function to be called when we want to send it to the next route.
     */
    readAll(request, response, next) {
        logger.info('Controller#readAll Read all instances of type: ', this.type, ' By User: ', request.session.userId);

        var filter = {};
        var self = this;
        crud.read(this.type, filter, {
            userId: request.session.userId,
            justMine: request.query['justMine']
        }, (err, result) => {
            if (err) {
                logger.error("It wasn't possible to read collection:", self.type, " by User: ", request.session.userId, " Error: ", err);
                return next(err);
            }

            let resultsWithRights = result
                .filter(element => this.hasRights(request.session.user, Permission.READ, element._id, element));
            this.permissions.forTypeCollection(this.type, resultsWithRights).then(() => {
                response.json({data: resultsWithRights});
            }).catch(err => {
                logger.error(`Controller#readAll Instances of type ${self.type} Error: `, err);
                response.status(500).json({status: 'err'});
            })
        });
    }

    /**
     * Default implementation of updating on rest object. This implementation doesn't verifies anything. Probably: The object is created if it didn't exist before
     * @param request {Request} Request created by the Express framework.
     * @param request.body.data {Object} Payload for object, which should be updated.
     * @param request.session.userId {Number} Id of the user who issued the request.
     * @param response.locals.isAdmin {Boolean} Whether the user is admin
     * @param response {Response} Response created by the Express framework.
     * @param next {Function} Function to be called when we want to send it to the next route.
     */
    update(request, response, next) {
        logger.info('Controller#update Update instance of type: ', this.type, ' By User: ', request.session.userId);
        var object = request.body.data;

        if (!this.hasRights(request.session.user, Permission.UPDATE, object._id, object)) {
            response.status(403);
            return;
        }

        var self = this;
        crud.update(this.type, object, {
            userId: request.session.userId,
            isAdmin: response.locals.isAdmin
        }, function (err, result) {
            if (err) {
                logger.error("It wasn't possible to update object of type: ", self.type, " by User: ", request.session.userId,
                    "With data: ", request.body.data, " Error:", err);
                return next(err);
            }
            response.data = result;
            next();
        });
    }

    /**
     * Default implementation of deletion of rest object. This implementation doesn't verifies anything.
     * @param request {Request} Request created by the Express framework.
     * @param request.params.id {Number} Number representing the id of the object to read
     * @param request.session.userId {Number} Id of the user who issued the request.
     * @param response {Response} Response created by the Express framework.
     * @param next {Function} Function to be called when we want to send it to the next route.
     */
    delete(request, response, next) {
        let id = request.params.id;
        logger.info('Controller#deleteObject Delete instance with id: ', id, ' of type: ', this.type, ' By User: ', request.session.userId);

        if (!this.service || !this.entity) {
            next();
        }

        let entity = new this.entity(id, this._connection);
        entity.json().then(json => {
            if (!this.hasRights(request.session.user, Permission.DELETE, id, json)) {
                response.status(403);
                return;
            }
            return this.service.remove(entity);
        }).then(() => {
            next();
        }).catch((error) => {
            logger.error('Controller#deleteObject Type: ', this.type, ' Error: ', error);
            next('It wasn\'t possible to delete given ' + this.type);
        });
    }

    // Default way to delete object.
    deleteObject(request, response, next) {
        logger.info('Controller#deleteObject Delete instance with id: ', request.body.data._id, ' of type: ', this.type, ' By User: ', request.session.userId);
        request.params.id = request.body.data._id;
        this.delete(request, response, next);
    }

    hasRights(user, method, id, object) {
        return true;
    }
}

module.exports = Controller;
