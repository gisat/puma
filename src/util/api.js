const qb = require('@imatic/pgqb');
const _ = require('lodash');

/**
 * @param {string[]} fieldPath Fields (e.g ['filter', 'partner'])
 * @returns {string} Query path (e.g. filter[partner])
 */
function fieldPathToQueryPath(fieldPath) {
    return (
        fieldPath.shift() +
        (fieldPath.length ? '[' + fieldPath.join('][') + ']' : '')
    );
}

/**
 * Converts joi validation error caused by invalid query parameters into
 * format described by json-api.
 * (https://jsonapi.org/format/#errors)
 *
 * @param {Object} validationError
 * @returns {Object}
 */
function createQueryErrorObject(validationError) {
    return {
        errors: validationError.details.map((detail) => {
            return {
                title: 'Invalid parameter',
                detail: detail.message,
                code: detail.type,
                source: {
                    parameter: fieldPathToQueryPath(detail.path),
                },
                meta: _.get(detail, 'context', {}),
            };
        }),
    };
}

/**
 * @param {string[]} fieldPath Fields (e.g ['user', 'email'])
 * @returns {string} Data path (e.g. /user/email)
 */
function fieldPathToDataPath(fieldPath) {
    return '/' + fieldPath.join('.').replace(/\./g, '/');
}

/**
 * Converts joi validation error caused by invalid body into
 * format described by json-api.
 * (https://jsonapi.org/format/#errors)
 *
 * @param {Object} validationError
 * @returns {Object}
 */
function createDataErrorObject(validationError) {
    return {
        errors: validationError.details.map((detail) => {
            return {
                title: 'Invalid data',
                detail: detail.message,
                code: detail.type,
                source: {
                    pointer: fieldPathToDataPath(detail.path),
                },
                meta: _.get(detail, 'context', {}),
            };
        }),
    };
}

module.exports = {
    fieldPathToQueryPath,
    fieldPathToDataPath,
    createQueryErrorObject,
    createDataErrorObject,
};
