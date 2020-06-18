const express = require('express');

/**
 * @typedef {Object} RouteData
 * @property {String} path
 * @property {String} method
 * @property {Array<Function>} middlewares - Array of expressjs middlewares
 * @property {Function} handler - Expressjs handler
 */

/**
 * Converts `api` into express router.
 *
 * All middlewares and handler will have route data at disposal under `request.match.data` path.
 *
 * @param {Array<RouteData>} api
 */
function routerFromApi(api) {
    const apiRouter = express.Router();

    api.forEach((handler) => {
        const middlewares = handler.middlewares || [];
        apiRouter[handler.method].call(
            apiRouter,
            handler.path,
            function (request, response, next) {
                request.match = {data: handler};
                next();
            },
            ...middlewares,
            handler.handler
        );
    });

    return apiRouter;
}

module.exports = {
    routerFromApi,
};
