let config = require('../config');
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
	constructor(app, pgPool, commonSchema, mongo) {
        if(!config.email) {
			throw new Error(`Invitation service won't work. Supply email to the configuration.`);
        }

        app.post('/rest/invitation/user', this.invite.bind(this));

		app.get('/rest/user', this.readAll.bind(this));
		app.get('/rest/user/simple', this.readAllSimple.bind(this));
		app.post('/rest/user', this.create.bind(this));
		app.put('/rest/user', this.update.bind(this));
		app.delete('/rest/user', this.delete.bind(this));

        app.get('/rest/user/:id', this.byId.bind(this));

		this.permissions = new PgPermissions(pgPool, commonSchema || config.postgreSqlSchema);
		this.users = new PgUsers(pgPool, commonSchema || config.postgreSqlSchema);
		this.groups = new PgGroups(pgPool, commonSchema || config.postgreSqlSchema);

		this.pgPool = pgPool;
		this.schema = commonSchema || config.postgreSqlSchema;
		this.mongo = mongo;
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

	readAllSimple(request, response) {
		this.users.jsonSimple()
			.then((pgRows) => {
				return _.map(pgRows, (pgRow) => {
					return {
						_id: pgRow.id,
						username: pgRow.name
					}
				});
			})
			.then((pgUsers) => {
				response
					.status(200)
					.json({
						data: pgUsers,
						success: true
					});
			})
			.catch((error) => {
				logger.error('UserController#readAllSimple Error: ', error);
				response
					.status(500)
					.json({
						message: error.message,
						success: false
					});
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
		let phone = request.body.phone;
		let email;
        this.getInvitation(hash).verify().then(pEmail => {
        	email = pEmail;

        	return this.users.create(password, name, email, phone);
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
	 * {
	 		name: "Jakub Balhar",
	 		password: "someRandomLongPassword",
	 		username: "jakub@balhar.net"

			permissions: ["location", "dataset"],

            // Permissions of the users towards this user
			users: {
				read: [1,22,3],
				update: [2,33,4],
				delete: [2,15,3]
			},

            // Permissions of the groups towards this user
			groups: {
				read: [1,23,4],
				update: [1,23,4],
				delete: [1,23,4]
			}
	 * }
     * @param request
     * @param response
     */
	update(request, response) {
        logger.info(`UserController#update Id: ${request.body.id}, Name: ${request.body.name}, Username: ${request.body.username}, Email: ${request.body.username}`);

        let user = request.body;
        let id = Number(user.id);
        if(!this.hasRights(request.session.user, Permission.UPDATE, id)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

		this.users.update(id, user).then(() => {
			response.json({
				message: 'The user was correctly created.'
			});
		}).catch(err => {
			logger.error(`UserController#update Error: `, err);P
			response.status(500).json({error: err});
		});
    }

    /**
	 * If the current user has the rights to delete the user with passed id, this user is deleted. At the moment it keeps
	 * references other than the permissions and groups.
     * @param request
     * @param response
     */
    delete(request, response) {
        logger.info(`UserController#delete Id: ${request.body.id}`);

		let userId = request.body.id;
        if(!this.hasRights(request.session.user, Permission.DELETE, userId)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        this.users.delete(userId).then(() => {
			response.json({
				message: 'The user was correctly deleted.'
			})
		}).catch(err => {
            logger.error(`UserController#delete Error: `, err);
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