let config = require('../../config');
let logger = require('../common/Logger').applicationWideLogger;

let Permission = require('./Permission');
let PgPermissions = require('./PgPermissions');
let PgUsers = require('./PgUsers');
let PgInvitation = require('./PgMailInvitation');
let PgGroups = require('./PgGroups');

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
        app.get('/rest/user/:id', this.byId.bind(this));

		this.permissions = new PgPermissions(pgPool, commonSchema || config.pgSchema.data);
		this.users = new PgUsers(pgPool, commonSchema || config.pgSchema.data);
		this.groups = new PgGroups(pgPool, commonSchema || config.pgSchema.data);

		this.pgPool = pgPool;
		this.schema = commonSchema || config.pgSchema.data;
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
			response.json({data: jsonUsers});
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

	hasRights(user, method, id) {
		return user.hasPermission('user', method, id) || user.id === id;
	}
}

module.exports = UserController;