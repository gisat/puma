const Joi = require('@hapi/joi');
const uuid = require('../../uuid');
const config = require('../../config');
const qb = require('@imatic/pgqb');
const compiler = require('./compiler');
const {SQL} = require('sql-template-strings');

/**
 * Plan of individual types is stored under <group>.<type>.
 *
 * ## table (optional)
 *
 * Table name in case it differs from type name.
 *
 * ## columns
 *
 * ### schema (required)
 *   Joi schema (https://hapi.dev/module/joi/api/). `.required()` should not be used as it is added automatically based on context.
 *
 * ### defaultValue (optional)
 *   Default value if none was provided (https://hapi.dev/module/joi/api/#anydefaultvalue).
 *
 * ### modifyExpr (optional)
 *   Returns query expression used as a value in create and update queries.
 *
 * ## relations
 *
 * ## context (required)
 *
 * Configuration for specific operations. Supported operations are: `list`, `create`, `update`.
 *
 * ### columns (required)
 *
 * Allowed columns during this operation.
 */
module.exports = compiler.compile({
    user: {
        user: {
            table: 'users',
            context: {
                list: {
                    columns: ['key', 'email', 'name', 'phone'],
                },
                create: {
                    columns: ['key', 'email', 'name', 'phone', 'password'],
                },
                update: {
                    columns: ['key', 'email', 'name', 'phone', 'password'],
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
                password: {
                    defaultValue: null,
                    schema: Joi.string(),
                    modifyExpr: function ({value}) {
                        if (value == null) {
                            return qb.val.inlineParam(null);
                        }

                        return qb.val.raw(
                            SQL`CRYPT(${value}, GEN_SALT('bf', ${config.password.iteration_counts}))`
                        );
                    },
                },
            },
            relations: {
                group: {
                    type: 'manyToMany',
                    relationTable: 'user.userGroups',
                    ownKey: 'userKey',
                    inverseKey: 'groupKey',
                    resourceGroup: 'user',
                    resourceType: 'groups',
                },
                permission: {
                    type: 'manyToMany',
                    relationTable: 'user.userPermissions',
                    ownKey: 'userKey',
                    inverseKey: 'permissionKey',
                    resourceGroup: 'user',
                    resourceType: 'permissions',
                },
            },
        },
        groups: {
            context: {
                list: {
                    columns: ['key', 'name'],
                },
                create: {
                    columns: ['key', 'name'],
                },
                update: {
                    columns: ['key', 'name'],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                name: {
                    schema: Joi.string(),
                },
            },
        },
        permissions: {
            context: {
                list: {
                    columns: [
                        'key',
                        'resourceKey',
                        'resourceType',
                        'permission',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'resourceKey',
                        'resourceType',
                        'permission',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'resourceKey',
                        'resourceType',
                        'permission',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                resourceKey: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                resourceType: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                permission: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
    },
    metadata: {
        scope: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                nameDisplay: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                nameInternal: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                description: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                // todo: configuration
            },
        },
        place: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                nameDisplay: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                nameInternal: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                description: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                // todo:
                // geometry: {},
                // bbox: {},
            },
        },
    },
});
