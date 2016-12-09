let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let PgPermissions = require('./PgPermissions');
let PgUsers = require('./PgUsers');
let User = require('./User');

/**
 * It allows management and querying of permissions.
 * @alias UserController
 */
class UserController {
    constructor(app, pgPool, commonSchema) {
        app.get('/rest/user/:id', this.byId.bind(this));
        app.post('/rest/permission/user', this.addPermission.bind(this));
        app.delete('/rest/permission/user', this.removePermission.bind(this));

        this.permissions = new PgPermissions(pgPool, commonSchema || config.postgreSqlSchema);
        this.users = new PgUsers(pgPool, commonSchema || config.postgreSqlSchema);
        this.pgPool = pgPool
    }

    byId(request, response, next) {
        if (!request.session.user.hasPermission('user', 'GET', request.params.id)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        this.users.byId(request.params.id).then(user => {
            response.json({data: user.json()});
        }).catch(err => {
            logger.error('UserController#byId Error: ', err);
            response.status(500);
        });
    }

    /**
     * It adds permission for given user to given resource.
     * @param request {Object}
     * @param request.body {Object}
     * @param request.body.userId {Number}
     * @param request.body.resourceId {Number}
     * @param request.body.resourceType {String}
     * @param response
     */
    addPermission(request, response) {
        if (!request.session.user.hasPermission('permission', 'POST', request.body.userId)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        let permission = request.body;
        this.permissions.add(permission.userId, permission.resourceType, permission.resourceId, permission.permission)
            .then(() => {
                response.json({status: "Ok"});
            }).catch(err => {
            logger.error('UserController#addPermission Error: ', err);
            response.status(500);
        });
    }

    removePermission(request, response) {
        if (!request.session.user.hasPermission('permission', 'DELETE', request.body.userId)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        let permission = request.body;
        this.permissions.remove(permission.userId, permission.resourceType, permission.resourceId, permission.permission)
            .then(() => {
                response.json({status: "Ok"});
            }).catch(err => {
            logger.error('UserController#removePermission Error: ', err);
            response.status(500);
        });
    }
}

module.exports = UserController;