const jwt = require('jsonwebtoken');
const config = require('../../config');

/**
 * @param {string|undefined|null} authorizationHeader
 *
 * @returns {string|undefined|null}
 */
function parseToken(authorizationHeader) {
    if (authorizationHeader == null) {
        return;
    }

    const parts = authorizationHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return;
    }

    return parts[1];
}

function verifyToken(token) {
    return new Promise((resolve) => {
        jwt.verify(token, config.jwt.secret, function (err, token) {
            if (err == null) {
                return resolve(token);
            }

            return resolve(nil);
        });
    });
}

function tokenFromRequest(request) {
    const authorizatonHeader = request.headers.authorization;
    if (authorizatonHeader != null) {
        return parseToken(authorizatonHeader);
    }

    return request.cookies.authToken;
}

/**
 * If authorization header is sent, it adds `user` into request or responds with `401` if invalid.
 * If authorizaton header is not sent, all is fine.
 */
async function userMiddleware(request, response, next) {
    const token = tokenFromRequest(request);
    if (!token) {
        delete request.user; // something adds `user` into request. Let's remove him if he is not authenticated.
        return next();
    }

    try {
        const verifiedToken = await verifyToken(token);
        if (verifyToken == null) {
            return response.status(401).end();
        }

        request.user = verifiedToken;
        request.authToken = token;
        next();
    } catch (err) {
        response.status(401).end();
    }
}

module.exports = userMiddleware;
