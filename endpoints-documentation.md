**Metadata/data endpoint documentation**

###### Possible endpoints:

    /backend/rest/metadata [POST|PUT|DELETE]
	/backend/rest/metadata/filtered/scopes [POST]
	/backend/rest/metadata/filtered/places [POST]
	/backend/rest/metadata/filtered/periods [POST]
	/backend/rest/metadata/filtered/attributeSets [POST]
	/backend/rest/metadata/filtered/attributes [POST]
	/backend/rest/metadata/filtered/layerTemplates [POST]
	/backend/rest/metadata/filtered/scenarios [POST]
	/backend/rest/metadata/filtered/cases [POST]
	/backend/rest/metadata/filtered/areaTrees [POST]
	/backend/rest/metadata/filtered/areaTreeLevels [POST]
	/backend/rest/metadata/filtered/tags [POST]
	
	/backend/rest/relations [POST/PUT/DELETE]
	/backend/rest/relations/filtered/spatial [POST]
	/backend/rest/relations/filtered/attribute [POST]
	/backend/rest/relations/filtered/area [POST]
	
	/backend/rest/dataSources [POST/PUT/DELETE]
	/backend/rest/dataSources/filtered/attribute [POST]
	/backend/rest/dataSources/filtered/spatial [POST]
	
	/backend/rest/applications [POST/PUT/DELETE]
	/backend/rest/applications/filtered/layerTrees [POST]
	/backend/rest/applications/filtered/applications [POST]
	/backend/rest/applications/filtered/configurations [POST]
	
	/backend/rest/views [POST/PUT/DELETE]
	/backend/rest/views/filtered/views [POST]
	
	/backend/rest/specific [POST/PUT/DELETE]
	/backend/rest/specific/filtered/esponFuoreIndicators [POST]
	
###### Possilbe payloads:

    /backend/rest/<TYPE> [POST]
    
    CREATE - JSON
    
    {
        "data": {
            [GROUP]: [
                {
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                },
                {
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                }
            ],
            [GROUP2]: [
                {
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                },
                {
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                }
            ]
        }
    }

    
    /backend/rest/<TYPE> [PUT]
    
    UPDATE - JSON
    
    {
        "data": {
            [GROUP]: [
                {
                    "key": "uuid-key",
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                },
                {
                    "key": "uuid-key-2",
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                }
            ],
            [GROUP2]: [
                {
                    "key": "uuid-key",
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                },
                {
                    "key": "uuid-key-2",
                    "data": {
                        "columnName": "value",
                        "columnName: "value2"
                    }
                }
            ]
        }
    }
    
    
    /backend/rest/<TYPE> [DELETE]
        
    DELETE - JSON
        
    {
        "data": {
            [GROUP]: [
                {
                    "key": "uuid-key"
                },
                {
                    "key": "uuid-key-2"
                }
            ],
            [GROUP2]: [
                {
                    "key": "uuid-key"
                },
                {
                    "key": "uuid-key-2"
                }
            ]
        }
    }
    
    
    /backend/rest/<TYPE>/filtered/<GROUP> [POST]
    
    READ - JSON
    
    {
        "filter": {
            [columnName]: value,
            [columnName]: {
                in: [value, value]
            },
            [columnName]: {
                notin: [value, value]
            },
            [columnName]: {
                like: value
            },
            [<relationType>Key]: {
                in: [value, value]
            },
            [<relationType>Key]: {
                notin: [value, value]
            },
            [<relationType>Key]: {
                like: value
            },
            [<relationType>Key]: value,
            [<relationType>Keys]: {
                includes: [value, value]
            },
            [<relationType>Keys]: {
                excludes: [value, value]
            },
            [<relationType>Keys]: {
                match: [value, value]
            },
            [<relationType>Keys]: [value, value]
        },
        "order": [[<columnName>, ascending], [<columnName>, descending]]
    }

###### Possible columns by type:

    /backend/rest/metadata/filtered/scopes
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|null>,
        "configuration": <JsonObject|Null>,
        "applicationKey": "<String|Null>"
    }
    
    /backend/rest/metadata/filtered/places
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "geometry": <String|Null>,
        "bbox": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/periods
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "period": <String|Null>,
        "applicationKey": <String|Null>,
        "scopeKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/attributeSets
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/attribute
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "type": <String|Null>,
        "unit": <String|Null>,
        "color": <String|Null>,
        "valueType": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/layerTemplates
     {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "applicationKey": <String|Null>,
        "scopeKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/scenarios
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/cases
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/metadata/filtred/areaTrees
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "scopeKey": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/areaTreeLevels
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "level": <Integer|Null>,
        "areaTreeKey": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/tags
    {
        "nameDisplay": <String|Null>,
        "nameInternal": <String|Null>,
        "description": <String|Null>,
        "color": <String|Null>,
        "applicationKey": <String|Null>
        "scopeKey": <String|Null>
    }
    
    /backend/rest/metadata/filtered/spatial
    {
        "scopeKey": <String|Null>,
        "periodKey": <String|Null>,
        "placeKey": <String|Null>,
        "spatialDataSourceKey": <String|Null>,
        "layerTemplateKey": <String|Null>,
        "scenarioKey": <String|Null>,
        "caseKey": <String|Null>,
        "fidColumnName": <String|Null>
    }
    
    /backend/rest/metadata/filtered/attribute
    {
        "scopeKey": <String|Null>,
        "periodKey": <String|Null>,
        "placeKey": <String|Null>,
        "attributeDataSourceKey": <String|Null>,
        "layerTemplateKey": <String|Null>,
        "scenarioKey": <String|Null>,
        "caseKey": <String|Null>,
        "attributeSetKey": <String|Null>,
        "attributeKey": <String|Null>,
        "areaTreeLevelKey": <String|Null>,
        "fidColumnName": <String|Null>
    }
    
    /backend/rest/metadata/filtered/area
    {
        "areaTreeKey": <String|Null>,
        "areaTreeLevelKey": <String|Null>,
        "fidColumn": <String|Null>,
        "parentFidColumn": <String|Null>,
        "dataSourceKey": <String|Null>,
        "scopeKey": <String|Null>,
        "placeKey": <String|Null>,
        "periodKey": <String|Null>,
        "caseKey": <String|Null>,
        "scenarioKey": <String|Null>
    }
    
    /backend/rest/dataSources/filtered/attribute
    {
        "nameInternal": <String|Null>,
        "attribution": <String|Null>,
        "tableName": <String|Null>,
        "columnName": <String|Null>
    }
    
    /backend/rest/dataSources/filtered/spatial
    {
        "nameInternal": <String|Null>,
        "attribution": <String|Null>,
        "type": <"vector"|"raster"|"wms"|"wmts">,
        "layerName": <String|Null>,
        "tableName": <String|Null>
    }
    
    /backend/rest/applications/filtered/layerTrees
    {
        "structure": <JsonObject[]|Null>,
        "nameInternal": <String|Null>,
        "scopeKey": <String|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/applications/filtered/applications
    {
        "name": <String|Null>,
        "description": <String|Null>,
        "color": <String|Null>
    }
    
    /backend/rest/applications/filtered/configurations
    {
        "data": <JsonObject[]|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/views/filtered/views
    {
        "nameInternal": <String|Null>,
        "nameDisplay": <String|Null>,
        "description": <String|Null>,
        "state": <JsonObject|Null>,
        "applicationKey": <String|Null>
    }
    
    /backend/rest/specific/filtered/esponFuoreIndicators
    {
        "nameDisplay": <String|Null>,
        "description": <String|Null>,
        "type": <String|Null>,
        "nameInternal": <String|Null>,
        "attributeKey": <String|Null>,
        "viewKey": <String|Null>,
        "tagKeys": <String[]|Null>,
        "scopeKey": <String|Null>
    }