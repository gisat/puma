const Joi = require('@hapi/joi');
const apiUtil = require('../util/api');

/**
 * Coerces request parameters (body, path, query) using given Joi schema.
 *
 * Joi schema can be attached to route data in `parameters` key. Value
 * is map with `body`, `path`, `query` keys with schema as their values.
 *
 * Coerced values will be stored into `request.parameters` map under given key.
 * In case parameters are invalid, `next` won't be called and error response will be sent.
 *
 * inspiration: https://metosin.github.io/reitit/parameter_coercion.html
 */
function parameters(request, response, next) {
    const parameters = request.match.data.parameters;

    const responseParameters = {};

    const QuerySchema = parameters.query;
    if (QuerySchema != null) {
        const validationResult = QuerySchema.validate(request.query, {
            abortEarly: false,
        });
        if (validationResult.error) {
            return response
                .status(400)
                .json(apiUtil.createQueryErrorObject(validationResult.error));
        }

        responseParameters.query = validationResult.value;
    }

    const BodySchema = parameters.body;
    if (BodySchema != null) {
        const validationResult = BodySchema.validate(request.body, {
            abortEarly: false,
        });
        if (validationResult.error) {
            return response
                .status(400)
                .json(apiUtil.createDataErrorObject(validationResult.error));
        }

        responseParameters.body = validationResult.value;
    }

    const PathSchema = parameters.path;
    if (PathSchema != null) {
        const validationResult = PathSchema.validate(request.params, {
            abortEarly: false,
        });

        if (validationResult.error) {
            return response
                .status(400)
                .json({errors: [{title: 'Invalid path params'}]});
        }

        responseParameters.path = validationResult.value;
    }

    request.parameters = responseParameters;
    next();
}

module.exports = parameters;
