const config = require('../config');
const logger = require('../common/Logger').applicationWideLogger;
const bcrypt = require('bcrypt');
const {SQL} = require('sql-template-strings');
const jwt = require('jsonwebtoken');
const userMiddleware = require('../middlewares/user');

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

function getUser(pgPool, schema, email, password) {
    return pgPool
        .query(
            SQL`SELECT "key", "password" FROM`
                .append(` "${schema}"."panther_users" `)
                .append(SQL`WHERE "email" = ${email}`)
        )
        .then((results) => {
            if (results.rows.length === 0) {
                return null;
            }

            user = results.rows[0];

            return bcrypt.compare(password, user.password).then((result) => {
                if (!result) {
                    return null;
                }

                return user;
            });
        });
}

/**
 * Controller for handling the login and logout of the user from the system. Internally this implementation uses Geonode
 * to log the user in.
 */
class LoginController {
    constructor(app, pgPool, commonSchema) {
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

        this.pgPool = pgPool;
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
            // const user = await this.pgUsers.verify(username, password);
            const user = await getUser(
                this.pgPool,
                this.schema,
                username,
                password
            );
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
