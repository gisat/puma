const express = require('express');

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
