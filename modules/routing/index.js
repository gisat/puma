const express = require('express');

function routerFromApi(api) {
    const apiRouter = express.Router();

    api.forEach((handler) => {
        const middlewares = handler.middlewares || [];
        apiRouter[handler.method].call(
            apiRouter,
            handler.path,
            ...middlewares,
            handler.handler
        );
    });

    return apiRouter;
}

module.exports = {
    routerFromApi,
};
