const Joi = require('@hapi/joi');
const uuid = require('../../uuid');
const config = require('../../../config');
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
                        'configuration',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'configuration',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'configuration',
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
                configuration: {
                    defaultValue: null,
                    schema: Joi.object(),
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.scopeRelation',
                    ownKey: 'parentScopeKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.scopeRelation',
                    ownKey: 'parentScopeKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
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
                        'geometry',
                        'bbox',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'geometry',
                        'bbox',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'geometry',
                        'bbox',
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
                geometry: {
                    defaultValue: null,
                    schema: Joi.object(),
                    modifyExpr: function ({value}) {
                        if (value == null) {
                            return qb.val.inlineParam(null);
                        }

                        return qb.val.raw(SQL`ST_GeomFromGeoJSON(${value})`);
                    },
                },
                bbox: {
                    defaultValue: null,
                    schema: Joi.object(),
                    modifyExpr: function ({value}) {
                        if (value == null) {
                            return qb.val.inlineParam(null);
                        }

                        return qb.val.raw(SQL`ST_GeomFromGeoJSON(${value})`);
                    },
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.placeRelation',
                    ownKey: 'parentPlaceKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.placeRelation',
                    ownKey: 'parentPlaceKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        period: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'period',
                        'start',
                        'end',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'period',
                        'start',
                        'end',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'period',
                        'start',
                        'end',
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
                period: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                start: {
                    defaultValue: null,
                    schema: Joi.date(),
                },
                end: {
                    defaultValue: null,
                    schema: Joi.date(),
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.periodRelation',
                    ownKey: 'parentPeriodKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                scope: {
                    type: 'manyToOne',
                    relationTable: 'relations.periodRelation',
                    ownKey: 'parentPeriodKey',
                    inverseKey: 'scopeKey',
                    resourceGroup: 'metadata',
                    resourceType: 'scope',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.periodRelation',
                    ownKey: 'parentPeriodKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        attributeSet: {
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
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.attributeSetRelation',
                    ownKey: 'parentAttributeSetKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.attributeSetRelation',
                    ownKey: 'parentAttributeSetKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        attribute: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'type',
                        'unit',
                        'valueType',
                        'color',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'type',
                        'unit',
                        'valueType',
                        'color',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'type',
                        'unit',
                        'valueType',
                        'color',
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
                type: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                unit: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                valueType: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                color: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.attributeRelation',
                    ownKey: 'parentAttributeKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.attributeRelation',
                    ownKey: 'parentAttributeKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        layerTemplate: {
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
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.layerTemplateRelation',
                    ownKey: 'parentLayerTemplateKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                scope: {
                    type: 'manyToOne',
                    relationTable: 'relations.layerTemplateRelation',
                    ownKey: 'parentLayerTemplateKey',
                    inverseKey: 'scopeKey',
                    resourceGroup: 'metadata',
                    resourceType: 'scope',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.layerTemplateRelation',
                    ownKey: 'parentLayerTemplateKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        scenario: {
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
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.scenarioRelation',
                    ownKey: 'parentScenarioKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.scenarioRelation',
                    ownKey: 'parentScenarioKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        case: {
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
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.caseRelation',
                    ownKey: 'parentCaseKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.caseRelation',
                    ownKey: 'parentCaseKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        areaTree: {
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
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.areaTreeRelation',
                    ownKey: 'parentAreaTreeKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                scope: {
                    type: 'manyToOne',
                    relationTable: 'relations.areaTreeRelation',
                    ownKey: 'parentAreaTreeKey',
                    inverseKey: 'scopeKey',
                    resourceGroup: 'metadata',
                    resourceType: 'scope',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.areaTreeRelation',
                    ownKey: 'parentAreaTreeKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        areaTreeLevel: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'level',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'level',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'level',
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
                level: {defaultValue: null, schema: Joi.number().integer()},
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.areaTreeLevelRelation',
                    ownKey: 'parentAreaTreeLevelKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                areaTree: {
                    type: 'manyToOne',
                    relationTable: 'relations.areaTreeLevelRelation',
                    ownKey: 'parentAreaTreeLevelKey',
                    inverseKey: 'areaTreeKey',
                    resourceGroup: 'metadata',
                    resourceType: 'areaTree',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.areaTreeLevelRelation',
                    ownKey: 'parentAreaTreeLevelKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        tag: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'color',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'color',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'color',
                    ],
                },
                relations: {
                    application: {
                        type: 'manyToOne',
                        relationTable: 'relations.tagRelation',
                        ownKey: 'parentTagKey',
                        inverseKey: 'applicationKey',
                        resourceGroup: 'application',
                        resourceType: 'application',
                    },
                    scope: {
                        type: 'manyToOne',
                        relationTable: 'relations.tagRelation',
                        ownKey: 'parentTagKey',
                        inverseKey: 'scopeKey',
                        resourceGroup: 'metadata',
                        resourceType: 'scope',
                    },
                    tag: {
                        type: 'manyToMany',
                        relationTable: 'relations.tagRelation',
                        ownKey: 'parentTagKey',
                        inverseKey: 'tagKey',
                        resourceGroup: 'metadata',
                        resourceType: 'tag',
                    },
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
                color: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
        style: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'source',
                        'nameGeoserver',
                        'definition',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'source',
                        'nameGeoserver',
                        'definition',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'source',
                        'nameGeoserver',
                        'definition',
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
                source: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                nameGeoserver: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                definition: {
                    defaultValue: null,
                    schema: Joi.object(),
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.styleRelation',
                    ownKey: 'parentStyleKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.styleRelation',
                    ownKey: 'parentStyleKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
    },
    application: {
        application: {
            context: {
                list: {
                    columns: ['key', 'name', 'description', 'color'],
                },
                create: {
                    columns: ['key', 'name', 'description', 'color'],
                },
                update: {
                    columns: ['key', 'name', 'description', 'color'],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                name: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                description: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                color: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
        configuration: {
            context: {
                list: {
                    columns: ['key', 'data'],
                },
                create: {
                    columns: ['key', 'data'],
                },
                update: {
                    columns: ['key', 'data'],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                data: {
                    defaultValue: null,
                    schema: Joi.object(),
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.configurationRelation',
                    ownKey: 'parentConfigurationKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
            },
        },
        layerTree: {
            context: {
                list: {
                    columns: ['key', 'nameInternal', 'structure'],
                },
                create: {
                    columns: ['key', 'nameInternal', 'structure'],
                },
                update: {
                    columns: ['key', 'nameInternal', 'structure'],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                nameInternal: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                structure: {
                    defaultValue: null,
                    schema: Joi.object(),
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.layerTreeRelation',
                    ownKey: 'parentLayerTreeKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
                scope: {
                    type: 'manyToOne',
                    relationTable: 'relations.layerTreeRelation',
                    ownKey: 'parentLayerTreeKey',
                    inverseKey: 'scopeKey',
                    resourceGroup: 'metadata',
                    resourceType: 'scope',
                },
            },
        },
    },
    dataSources: {
        attributeDataSource: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameInternal',
                        'attribution',
                        'tableName',
                        'columnName',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameInternal',
                        'attribution',
                        'tableName',
                        'columnName',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameInternal',
                        'attribution',
                        'tableName',
                        'columnName',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                nameInternal: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                attribution: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                tableName: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                columnName: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
        dataSource: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameInternal',
                        'attribution',
                        'type',
                        'sourceKey',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameInternal',
                        'attribution',
                        'type',
                        'sourceKey',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameInternal',
                        'attribution',
                        'type',
                        'sourceKey',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                nameInternal: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                attribution: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                type: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                sourceKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
            },
        },
    },
    relations: {
        spatialDataSourceRelation: {
            context: {
                list: {
                    columns: [
                        'key',
                        'scopeKey',
                        'periodKey',
                        'placeKey',
                        'spatialDataSourceKey',
                        'layerTemplateKey',
                        'scenarioKey',
                        'caseKey',
                        'fidColumnName',
                        'applicationKey',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'scopeKey',
                        'periodKey',
                        'placeKey',
                        'spatialDataSourceKey',
                        'layerTemplateKey',
                        'scenarioKey',
                        'caseKey',
                        'fidColumnName',
                        'applicationKey',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'scopeKey',
                        'periodKey',
                        'placeKey',
                        'spatialDataSourceKey',
                        'layerTemplateKey',
                        'scenarioKey',
                        'caseKey',
                        'fidColumnName',
                        'applicationKey',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                scopeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                periodKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                placeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                spatialDataSourceKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                layerTemplateKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                scenarioKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                caseKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                fidColumnName: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                applicationKey: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
        attributeDataSourceRelation: {
            context: {
                list: {
                    columns: [
                        'key',
                        'scopeKey',
                        'periodKey',
                        'placeKey',
                        'attributeDataSourceKey',
                        'layerTemplateKey',
                        'scenarioKey',
                        'caseKey',
                        'attributeSetKey',
                        'attributeKey',
                        'areaTreeLevelKey',
                        'fidColumnName',
                        'applicationKey',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'scopeKey',
                        'periodKey',
                        'placeKey',
                        'attributeDataSourceKey',
                        'layerTemplateKey',
                        'scenarioKey',
                        'caseKey',
                        'attributeSetKey',
                        'attributeKey',
                        'areaTreeLevelKey',
                        'fidColumnName',
                        'applicationKey',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'scopeKey',
                        'periodKey',
                        'placeKey',
                        'attributeDataSourceKey',
                        'layerTemplateKey',
                        'scenarioKey',
                        'caseKey',
                        'attributeSetKey',
                        'attributeKey',
                        'areaTreeLevelKey',
                        'fidColumnName',
                        'applicationKey',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                scopeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                periodKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                placeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                attributeDataSourceKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                layerTemplateKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                scenarioKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                caseKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                attributeSetKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                attributeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                areaTreeLevelKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                fidColumnName: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                applicationKey: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
        areaRelation: {
            context: {
                list: {
                    columns: [
                        'key',
                        'areaTreeKey',
                        'areaTreeLevelKey',
                        'fidColumnName',
                        'parentFidColumnName',
                        'spatialDataSourceKey',
                        'scopeKey',
                        'placeKey',
                        'periodKey',
                        'caseKey',
                        'scenarioKey',
                        'applicationKey',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'areaTreeKey',
                        'areaTreeLevelKey',
                        'fidColumnName',
                        'parentFidColumnName',
                        'spatialDataSourceKey',
                        'scopeKey',
                        'placeKey',
                        'periodKey',
                        'caseKey',
                        'scenarioKey',
                        'applicationKey',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'areaTreeKey',
                        'areaTreeLevelKey',
                        'fidColumnName',
                        'parentFidColumnName',
                        'spatialDataSourceKey',
                        'scopeKey',
                        'placeKey',
                        'periodKey',
                        'caseKey',
                        'scenarioKey',
                        'applicationKey',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                areaTreeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                areaTreeLevelKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                fidColumnName: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                parentFidColumnName: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                spatialDataSourceKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                scopeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                placeKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                periodKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                caseKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                scenarioKey: {
                    defaultValue: null,
                    schema: Joi.string().uuid(),
                },
                applicationKey: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
        },
    },
    views: {
        view: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameInternal',
                        'nameDisplay',
                        'description',
                        'state',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameInternal',
                        'nameDisplay',
                        'description',
                        'state',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameInternal',
                        'nameDisplay',
                        'description',
                        'state',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                nameInternal: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                nameDisplay: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                description: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                state: {
                    defaultValue: null,
                    schema: Joi.object(),
                },
            },
            relations: {
                application: {
                    type: 'manyToOne',
                    relationTable: 'relations.viewRelation',
                    ownKey: 'parentViewKey',
                    inverseKey: 'applicationKey',
                    resourceGroup: 'application',
                    resourceType: 'application',
                },
            },
        },
    },
    specific: {
        esponFuoreIndicator: {
            context: {
                list: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'type',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'type',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'nameDisplay',
                        'nameInternal',
                        'description',
                        'type',
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
                type: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
            relations: {
                attribute: {
                    type: 'manyToOne',
                    relationTable: 'relations.esponFuoreIndicatorRelation',
                    ownKey: 'parentEsponFuoreIndicatorKey',
                    inverseKey: 'attributeKey',
                    resourceGroup: 'metadata',
                    resourceType: 'attribute',
                },
                view: {
                    type: 'manyToOne',
                    relationTable: 'relations.esponFuoreIndicatorRelation',
                    ownKey: 'parentEsponFuoreIndicatorKey',
                    inverseKey: 'viewKey',
                    resourceGroup: 'views',
                    resourceType: 'view',
                },
                scope: {
                    type: 'manyToOne',
                    relationTable: 'relations.esponFuoreIndicatorRelation',
                    ownKey: 'parentEsponFuoreIndicatorKey',
                    inverseKey: 'scopeKey',
                    resourceGroup: 'metadata',
                    resourceType: 'scope',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.esponFuoreIndicatorRelation',
                    ownKey: 'parentEsponFuoreIndicatorKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
        lpisChangeCase: {
            context: {
                list: {
                    columns: [
                        'key',
                        'submitDate',
                        'codeDpb',
                        'codeJi',
                        'caseKey',
                        'changeDescription',
                        'changeDescriptionPlace',
                        'changeDescriptionOther',
                        'evaluationResult',
                        'evaluationDescription',
                        'evaluationDescriptionOther',
                        'evaluationUsedSources',
                        'geometryBefore',
                        'geometryAfter',
                        'status',
                    ],
                },
                create: {
                    columns: [
                        'key',
                        'submitDate',
                        'codeDpb',
                        'codeJi',
                        'caseKey',
                        'changeDescription',
                        'changeDescriptionPlace',
                        'changeDescriptionOther',
                        'evaluationResult',
                        'evaluationDescription',
                        'evaluationDescriptionOther',
                        'evaluationUsedSources',
                        'geometryBefore',
                        'geometryAfter',
                        'status',
                    ],
                },
                update: {
                    columns: [
                        'key',
                        'submitDate',
                        'codeDpb',
                        'codeJi',
                        'caseKey',
                        'changeDescription',
                        'changeDescriptionPlace',
                        'changeDescriptionOther',
                        'evaluationResult',
                        'evaluationDescription',
                        'evaluationDescriptionOther',
                        'evaluationUsedSources',
                        'geometryBefore',
                        'geometryAfter',
                        'status',
                    ],
                },
            },
            columns: {
                key: {
                    defaultValue: () => uuid.generate(),
                    schema: Joi.string().uuid(),
                },
                submitDate: {
                    defaultValue: null,
                    schema: Joi.date(),
                },
                codeDpb: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                codeJi: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                caseKey: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                changeDescription: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                changeDescriptionPlace: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                changeDescriptionOther: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                evaluationResult: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                evaluationDescription: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                evaluationDescriptionOther: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                evaluationUsedSources: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
                geometryBefore: {
                    defaultValue: null,
                    schema: Joi.object(),
                    modifyExpr: function ({value}) {
                        if (value == null) {
                            return qb.val.inlineParam(null);
                        }

                        return qb.val.raw(SQL`ST_GeomFromGeoJSON(${value})`);
                    },
                },
                geometryAfter: {
                    defaultValue: null,
                    schema: Joi.object(),
                    modifyExpr: function ({value}) {
                        if (value == null) {
                            return qb.val.inlineParam(null);
                        }

                        return qb.val.raw(SQL`ST_GeomFromGeoJSON(${value})`);
                    },
                },
                status: {
                    defaultValue: null,
                    schema: Joi.string(),
                },
            },
            relations: {
                view: {
                    type: 'manyToOne',
                    relationTable: 'relations.lpisChangeCaseRelation',
                    ownKey: 'parentLpisChangeCaseKey',
                    inverseKey: 'viewKey',
                    resourceGroup: 'views',
                    resourceType: 'view',
                },
                tag: {
                    type: 'manyToMany',
                    relationTable: 'relations.lpisChangeCaseRelation',
                    ownKey: 'parentLpisChangeCaseKey',
                    inverseKey: 'tagKey',
                    resourceGroup: 'metadata',
                    resourceType: 'tag',
                },
            },
        },
    },
});
