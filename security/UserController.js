let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let superagent = require('superagent');
let Promise = require('promise');

let Permission = require('./Permission');
let PgPermissions = require('./PgPermissions');
let PgUsers = require('./PgUsers');
let PgInvitation = require('./PgMailInvitation');

/**
 * It allows management of users. Currently it can retrieve all users in the system, retrieve details about specific
 * user and manipulate permissions for the user.
 * @alias UserController
 * @constructor
 */
class UserController {
	constructor(app, pgPool, commonSchema) {
        if(!config.email) {
			throw new Error(`Invitation service won't work. Supply email to the configuration.`);
        }

        app.post('/rest/invitation/user', this.invite.bind(this));

        app.get('/rest/user', this.readAll.bind(this));
		app.post('/rest/user', this.create.bind(this));
		app.put('/rest/user', this.update.bind(this));
        app.get('/rest/user/:id', this.byId.bind(this));

        app.post('/rest/permission/user', this.addPermission.bind(this));
		app.delete('/rest/permission/user', this.removePermission.bind(this));

		this.permissions = new PgPermissions(pgPool, commonSchema || config.postgreSqlSchema);
		this.users = new PgUsers(pgPool, commonSchema || config.postgreSqlSchema);

		this.pgPool = pgPool;
		this.schema = commonSchema || config.postgreSqlSchema;
	}

	/**
	 * It returns basic information, groups and permissions for all users in the platform.
	 * @param request
	 * @param response
	 */
	readAll(request, response) {
		logger.info(`UserController#readAll`);

		this.users.all().then(users => {
			let jsonUsers = users.map(user => user.json());
			response.json(JSON.stringify({data: jsonUsers}));
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
	byId(request, response) {
		logger.info(`UserController#byId Id: ${request.params.id}`);

		if (!request.session.user.hasPermission('user', Permission.READ, request.params.id)) {
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
	 * Create invitation hash. Store this hash into the database and send the information in the email. The email
	 * is required part of the process.
     * @param request
     * @param response
     */
	invite(request, response) {
		logger.info(`UserController#invitation Email: ${request.body.email}`);

        if (!request.session.user.hasPermission('user', Permission.CREATE)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        let email = request.body.email;
		if(!email) {
			response.status(400);
			response.json({"status": "err"});
		}

		this.getInvitation(null).send(email, `${config.remoteProtocol}://${config.remoteAddress}${config.projectHome}/backoffice/register`).then(() => {
			response.json({"status": "ok"});
		}).catch(err => {
			logger.error(`UserController#invite Error: `, err);
			response.status(500).json({error: err});
		});
	}

    /**
	 * In order to get there it is necessary to have correct hash which retrieves the information.
     * @param request
     * @param response
     */
	create(request, response) {
		logger.info(`UserController#create Hash: ${request.body.hash}, Name: ${request.body.name}`);

		let hash = request.body.hash;
		let name = request.body.name;
		let password = request.body.password;
		let email;
        this.getInvitation(hash).verify().then(pEmail => {
        	email = pEmail;

        	return this.users.create(password, name, email);
		}).then(id => {
        	response.json({
				data: {
					id: id,
					password: password,
					name: name,
					email: email
				},
				message: 'The user was correctly created.'
			});
		}).catch(err => {
            logger.error(`UserController#create Error: `, err);
            response.status(500).json({error: err});
		})
	}

    /**
	 * It is full update the whole information about the user is expected.
     * @param request
     * @param response
     */
	update(request, response) {
        logger.info(`UserController#update Id: ${request.body.id}, Name: ${request.body.name}, Username: ${request.body.username}, Email: ${request.body.email}`);

        let id = Number(request.body.id);

		if(request.session.user.id != id) {
			response.status(403).json({
				error: 'You are trying to update other than logged in user.'
			});
		} else {
            let name = request.body.name;
            let password = request.body.password;
            let email = request.body.email;

            this.users.update(id, name, password, email).then(() => {
                response.json({
                    data: {
                        id: id,
                        password: password,
                        name: name,
                        email: email
                    },
                    message: 'The user was correctly created.'
                });
			}).catch(err => {
                logger.error(`UserController#update Error: `, err);
                response.status(500).json({error: err});
			});
		}
    }

	getInvitation(hash){
		return new PgInvitation(this.pgPool, this.schema, {
            host: config.email.host,
            port: config.email.port,
            user: config.email.user,
            pass: config.email.password,
            from: config.email.from,
            subject: config.email.subject
        }, hash);
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
		if (!request.session.user.hasPermission('permission', Permission.CREATE, request.body.userId)) {
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
		if (!request.session.user.hasPermission('permission', Permission.DELETE, request.body.userId)) {
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

	hasRights(user, method, id) {
		return user.hasPermission('user', method, id) || user.id == id;
	}
}

module.exports = UserController;