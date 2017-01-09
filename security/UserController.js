let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let superagent = require('superagent');
let Promise = require('promise');

let PgPermissions = require('./PgPermissions');
let PgUsers = require('./PgUsers');
let User = require('./User');

/**
 * It allows management of users. Currently it can retrieve all users in the system, retrieve details about specific
 * user and manipulate permissions for the user.
 * @alias UserController
 * @constructor
 */
class UserController {
	constructor(app, pgPool, commonSchema) {
		app.get('/rest/user', this.readAll.bind(this));
		app.get('/rest/user/:id', this.byId.bind(this));
		app.post('/rest/permission/user', this.addPermission.bind(this));
		app.delete('/rest/permission/user', this.removePermission.bind(this));

		this.permissions = new PgPermissions(pgPool, commonSchema || config.postgreSqlSchema);
		this.users = new PgUsers(pgPool, commonSchema || config.postgreSqlSchema);
		this.pgPool = pgPool
	}

	/**
	 * It returns basic information, groups and permissions for all users in the platform.
	 * @param request
	 * @param response
	 * @param next
	 */
	readAll(request, response, next) {
		if (!request.session.user.hasPermission('user', 'GET')) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}

		let usersUrl = `${config.geonodeProtocol}://${config.geonodeHost}:${config.geonodePort}${config.geonodePath}/api/profiles`;
		let result = [];
		superagent.get(usersUrl).then((retrieved) => {
			let users = retrieved.body.objects;

			return Promise.all(users.map(user => {
				return this.users.byId(user.id).then(loaded => {
					let json = loaded.json();
					json.email = user.email;
					json.firstName = user.first_name;
					json.lastName = user.last_name;
					json.username = user.username;

					result.push(json);
				}); // email, firstName, lastName, username
			}));
		}).then(() => {
			response.json(JSON.stringify({data: result}));
		}).catch(err => {
			logger.error('UserController#readAll Error: ', err);
			response.status(500);
			response.json({status: "err"});
		});
	}

	/**
	 * Returns details about the user with given id in parameters. For nonexistent user it simply returns empty data.
	 * @param request
	 * @param response
	 * @param next
	 */
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