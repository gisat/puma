const j2s = require('joi-to-swagger');
const _ = require('lodash');

function operationFromHandler(handler) {
    return handler.swagger || {};
}

function pathsFromApi(api) {
    const paths = {};

    api.forEach((handler) => {
        _.set(
            paths,
            [handler.path, handler.method],
            operationFromHandler(handler)
        );
    });

    return paths;
}

function configFromApi(api) {
    return {
        openapi: '3.0.2',
        info: {
            title: 'Puma',
            version: 'v1',
        },
        security: [
            {
                bearer: [],
            },
        ],
        paths: pathsFromApi(api),
        components: {
            securitySchemes: {
                bearer: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    };
}

module.exports = {
    configFromApi,
};
