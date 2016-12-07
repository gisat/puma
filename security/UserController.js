let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let PgPermissions = require('./PgPermissions');
let User = require('./User');

/**
 * It allows management and querying of permissions.
 * @alias PermissionController
 */
class PermissionController {
    constructor(app, pgPool, commonSchema) {
        app.post('/rest/permission/user', this.addPermission.bind(this));
        app.delete('/rest/permission/user', this.removePermission.bind(this));

        this.permissions = new PgPermissions(pgPool, commonSchema || config.postgreSqlSchema);
        this.pgPool = pgPool
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
		if(!request.session.user.hasPermission('permission', 'POST', request.body.userId)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}

        let permission = request.body;
        this.permissions.add(permission.userId, permission.resourceType, permission.resourceId, permission.permission)
            .then(() => {
                response.json({status: "Ok"});
        }).catch(err => {
            logger.error('PermissionController#addPermission Error: ', err);
            response.status(500);
        });
    }

    removePermission(request, response) {
		if(!request.session.user.hasPermission('permission', 'DELETE', request.body.userId)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}

		let permission = request.body;
        this.permissions.remove(permission.userId, permission.resourceType, permission.resourceId, permission.permission)
            .then(() => {
                response.json({status: "Ok"});
        }).catch(err => {
            logger.error('PermissionController#removePermission Error: ', err);
            response.status(500);
        });
    }
}

module.exports = PermissionController;