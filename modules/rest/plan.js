const Joi = require('@hapi/joi');
const uuid = require('../../uuid');

/**
 * Plain of individual types is stored under <group>.<type>.
 *
 * ## column
 *
 * ### schema
 *   Joi schema (https://hapi.dev/module/joi/api/).
 *
 * ### defaultValue
 *   Default value if none was provided (https://hapi.dev/module/joi/api/#anydefaultvalue).
 *
 * ## context
 *
 * Configuration for specific operations
 *
 * ### columns
 *
 * Allowed columns during this operation.
 */
module.exports = {
    user: {
        users: {
            context: {
                list: {
                    columns: ['key', 'email', 'name', 'phone'],
                },
                create: {
                    columns: ['key', 'email', 'name', 'phone'],
                },
                update: {
                    columns: ['key', 'email', 'name', 'phone'],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                email: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                name: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                phone: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
    },
};
