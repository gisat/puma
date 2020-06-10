const j2s = require('joi-to-swagger');
const _ = require('lodash');

function operationFromHandler(handler) {
    const operation = {};

    const BodySchema = _.get(handler, ['parameters', 'body']);
    if (BodySchema != null) {
        const ref = _.get(j2s(BodySchema, {}), ['swagger', '$ref']);
        operation.requestBody = {
            content: {
                'application/json': {
                    schema: {$ref: ref},
                },
            },
        };
    }

    const responses = _.get(handler, 'responses', {});
    operation.responses = _.mapValues(responses, (response) =>
        Object.assign({}, {description: ''}, response)
    );

    return operation;
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

function schemasFromApi(api) {
    return _.filter(
        _.map(api, (handler) => _.get(handler, ['parameters', 'body'])),
        (v) => v != null
    );
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
            schemas: Object.assign(
                {},
                ..._.map(
                    schemasFromApi(api),
                    (schema) => j2s(schema, {}).components.schemas
                )
            ),
        },
    };
}

module.exports = {
    configFromApi,
};
