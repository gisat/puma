const j2s = require('joi-to-swagger');
const _ = require('lodash');

/**
 * @param {import('../routing').RouteData} handler
 */
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

    const PathSchema = _.get(handler, ['parameters', 'path']);
    if (PathSchema != null) {
        operation.parameters = _.map(
            j2s(PathSchema, {}).swagger.properties,
            function (schema, property) {
                return {in: 'path', name: property, required: true, schema};
            }
        );
    }

    const responses = _.get(handler, 'responses', {});
    operation.responses = _.mapValues(responses, (response) =>
        Object.assign({}, {description: ''}, response)
    );

    const override = _.get(handler, 'swagger', {});

    return Object.assign({}, operation, override);
}

/**
 * Converts expres `:param` to swagger `{param}`
 *
 * @param {string} path
 *
 * @returns {string}
 */
function expressPathToSwaggerPath(path) {
    return path.replace(/:(\w+)/g, '{$1}');
}

/**
 * @param {Array<import('../routing').RouteData} api
 */
function pathsFromApi(api) {
    const paths = {};

    api.forEach((handler) => {
        _.set(
            paths,
            [expressPathToSwaggerPath(handler.path), handler.method],
            operationFromHandler(handler)
        );
    });

    return paths;
}

/**
 * @param {Array<import('../routing').RouteData} api
 */
function schemasFromApi(api) {
    return _.filter(
        _.map(api, (handler) => _.get(handler, ['parameters', 'body'])),
        (v) => v != null
    );
}

/**
 * @param {Array<import('../routing').RouteData} api
 * @returns {object} Swagger document
 */
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
