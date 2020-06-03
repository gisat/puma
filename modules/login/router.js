const express = require('express');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const userMiddleware = require('../../middlewares/user');
const authMiddleware = require('../../middlewares/auth');
const uuid = require('../../uuid');
const _ = require('lodash');
const q = require('./query');

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

const router = express.Router();

router.get('/rest/logged', userMiddleware, function (request, response) {
    if (request.user) {
        response.status(200).json({key: request.user.key});
    } else {
        response.status(404).json({status: 'Nobody is logged in.'});
    }
});

router.post('/api/login/login', async function (request, response, next) {
    const {username, password} = request.body;

    try {
        const user = await q.getUser(username, password);
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
});

router.post('/api/login/login-guest', async function (request, response) {
    const token = await createAuthToken(
        tokenPayload({key: uuid.generate(), type: 'guest'})
    );

    return response.status(200).json({token}).end();
});

router.post('/api/login/logout', function (request, response) {
    response.status(200).end();
});

router.get(
    '/api/login/getLoginInfo',
    userMiddleware,
    authMiddleware,
    async function (request, response) {
        const user = request.user;
        const [userInfo, userGroups] = await Promise.all([
            q.getUserInfoByKey(user.key),
            q.userGroupsByKey(user.key),
        ]);

        response.status(200).json({
            key: user.key,
            data: {
                name: _.get(userInfo, 'name', null),
                email: _.get(userInfo, 'email', null),
                // todo: add phone
            },
            groups: userGroups,
            permissions: {}, // todo
        });
    }
);

module.exports = router;
