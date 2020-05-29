const config = require('../config');
const logger = require('../common/Logger').applicationWideLogger;
const {SQL} = require('sql-template-strings');
const jwt = require('jsonwebtoken');
const userMiddleware = require('../middlewares/user');
const authMiddleware = require('../middlewares/auth');
const db = require('../db');
const uuid = require('../uuid');
const _ = require('lodash');

/**
 * @param {Object} user
 *
 * @returns {Object} Payload
 */
function tokenPayload({key, type}) {
    return {key, type};
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
        .then((res) => {
            return res.rows[0];
        });
}

function getUserInfoByKey(schema, key) {
    if (key == null) {
        return;
    }

    return db
        .query(
            SQL`SELECT "email", "name" FROM`
                .append(` "${schema}"."users" `)
                .append(SQL`WHERE "key" = ${key}`)
        )
        .then((res) => res.rows[0]);
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
        app.post('/api/login/login-guest', this.loginGuest.bind(this));
        app.post('/api/login/logout', this.logout.bind(this));
        app.get(
            '/api/login/getLoginInfo',
            userMiddleware,
            authMiddleware,
            this.getLoginInfo.bind(this)
        );

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

            const token = await createAuthToken(
                tokenPayload({...user, ...{type: 'user'}})
            );

            return response.status(200).json({token}).end();
        } catch (err) {
            next(err);
        }
    }

    async loginGuest(request, response) {
        const token = await createAuthToken(
            tokenPayload({key: uuid.generate(), type: 'guest'})
        );

        return response.status(200).json({token}).end();
    }

    logout(request, response, next) {
        response.status(200).end();
    }

    async getLoginInfo(request, response) {
        const user = request.user;
        const userInfo = await getUserInfoByKey(this.schema, user.key);

        response.status(200).json({
            key: user.key,
            data: {
                name: _.get(userInfo, 'name', null),
                email: _.get(userInfo, 'email', null),
                // todo: add phone
            },
            groups: [], // todo
            permissions: {}, // todo
        });
    }
}

module.exports = LoginController;
