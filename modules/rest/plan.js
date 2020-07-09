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
    },
});
