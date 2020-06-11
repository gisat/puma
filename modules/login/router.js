const express = require('express');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const userMiddleware = require('../../middlewares/user');
const authMiddleware = require('../../middlewares/auth');
const uuid = require('../../uuid');
const _ = require('lodash');
const q = require('./query');
const PgDatabase = require('../../postgresql/PgDatabase');
const db = require('../../db');

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

function formatPermissions(permissions) {
    const permissionsByResourceType = _.groupBy(
        permissions,
        (p) => p.resourceType
    );
    const pgDatabase = new PgDatabase(db.getPool());
    const dataTypesGroupedByType = pgDatabase.getDataTypeStoresGroupedByType();

    const formattedPermissions = {};
    dataTypesGroupedByType.forEach((dataType) => {
        const group = dataType.group;
        if (group == null) {
            return;
        }
        formattedPermissions[group] = {};
        dataType.stores.forEach((store) => {
            const resourceType = store.tableName();
            if (permissionsByResourceType[resourceType] == null) {
                return;
            }

            const permissions = Object.fromEntries(
                _.map(permissionsByResourceType[resourceType], (v) => [
                    v.permission,
                    true,
                ])
            );
            formattedPermissions[group][resourceType] = permissions;
        });
    });

    return formattedPermissions;
}

async function getLoginInfo(user, token) {
    const [userInfo, userGroups] = await Promise.all([
        q.getUserInfoByKey(user.key),
        q.userGroupsByUser(user),
    ]);

    const permissions = await (user.type === 'guest'
        ? q.groupPermissionsByKeys(userGroups.map((g) => g.key))
        : q.userPermissionsByKey(user.key));

    return {
        key: user.key,
        data: {
            name: _.get(userInfo, 'name', null),
            email: _.get(userInfo, 'email', null),
            phone: _.get(userInfo, 'phone', null),
        },
        permissions: formatPermissions(permissions),
        authToken: token,
    };
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

        return response.status(200).json(await getLoginInfo(user, token));
    } catch (err) {
        next(err);
    }
});

router.post('/api/login/logout', function (request, response) {
    response.status(200).end();
});

async function autoLogin(request, response, next) {
    if (request.user != null) {
        return next();
    }

    const user = {key: uuid.generate(), type: 'guest'};
    const token = await createAuthToken(tokenPayload(user));

    request.user = user;
    request.authToken = token;
    next();
}

router.get(
    '/api/login/getLoginInfo',
    userMiddleware,
    autoLogin,
    authMiddleware,
    async function (request, response) {
        response
            .status(200)
            .json(await getLoginInfo(request.user, request.authToken));
    }
);

module.exports = router;
