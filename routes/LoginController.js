const config = require('../config');
const logger = require('../common/Logger').applicationWideLogger;
const {SQL} = require('sql-template-strings');
const jwt = require('jsonwebtoken');
const userMiddleware = require('../middlewares/user');
const db = require('../db');

/**
 * @param {Object} user
 *
 * @returns {Object} Payload
 */
function tokenPayload({key}) {
    return {key};
}

/**
 * @param {Object} payload
 *
 * @returns Promise
 */
function createAuthToken(payload) {
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,
            config.jwt.secret,
            {expiresIn: config.jwt.expiresIn},
            function (err, token) {
                if (err == null) {
                    return resolve(token);
                }

                reject(err);
            }
        );
    });
}

function getUser(schema, email, password) {
    return db
        .query(
            SQL`SELECT "key", "password" FROM`
                .append(` "${schema}"."users" `)
                .append(
                    SQL`WHERE "email" = ${email} AND "password" = crypt(${password}, "password")`
                )
        )
        .then((results) => {
            return results.rows[0];
        });
}

/**
 * Controller for handling the login and logout of the user from the system. Internally this implementation uses Geonode
 * to log the user in.
 */
class LoginController {
    constructor(app, commonSchema) {
        if (!app) {
            throw new Error(
                logger.error(
                    'LoginController#constructor The controller must receive valid app.'
                )
            );
        }
        app.get('/rest/logged', userMiddleware, this.logged.bind(this));
        app.post('/api/login/login', this.login.bind(this));
        app.post('/api/login/logout', this.logout.bind(this));
        app.post('/api/login/getLoginInfo', this.getLoginInfo.bind(this));

        this.schema = commonSchema;
    }

    logged(request, response) {
        if (request.user) {
            response.status(200).json({key: request.user.key});
        } else {
            response.status(404).json({status: 'Nobody is logged in.'});
        }
    }

    async login(request, response, next) {
        const {username, password} = request.body;

        try {
            const user = await getUser(this.schema, username, password);
            if (user == null) {
                response.status(401).json().end();
                return;
            }

            const token = await createAuthToken(tokenPayload(user));

            return response.status(200).json({token}).end();
        } catch (err) {
            next(err);
        }
    }

    logout(request, response, next) {
        response.status(200).end();
    }

    getLoginInfo(request, response) {
        if (request.user.key) {
            response.status(200).json({
                data: {
                    userId: request.session.userId,
                    userName: request.session.user.username,
                    groups: request.session.user.groups,
                },
                success: true,
            });
        } else {
            response.status(200).json({});
        }
    }
}

module.exports = LoginController;
