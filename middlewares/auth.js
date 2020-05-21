/**
 * Responds with `401` if user is not authenticated.
 * (not that user middleware should be called before to authenticate user)
 */
async function authMiddleware(request, response, next) {
    if (request.user == null) {
        return response.status(401).end();
    }

    next();
}

module.exports = authMiddleware;
