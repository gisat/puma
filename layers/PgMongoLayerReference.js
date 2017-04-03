var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

class PgMongoLayerReference {
    constructor(layerReference) {
        this._layerReference = layerReference;
    }

    attributes() {
        var columnMap, attributeSet;
        return this._layerReference.columnMap().then(pColumnMap => {
            columnMap = pColumnMap;
            return this._layerReference.attributeSet();
        }).then(pAttributeSet => {
            attributeSet = pAttributeSet;
            return this._layerReference.layerName();
        }).then(tableName => {
            let tableAlias = this.tableAlias(tableName);
            return columnMap.map(column => {
                return {
                    source: column.column,
                    target: `as_${attributeSet}_attr_${column.attribute}`,
                    tableAlias: tableAlias
                };
            });
        })
    }

    table() {
        let tableName, fidColumn, layerName;
        return this.tableName().then(pLayerName => {
            tableName = pLayerName;
            return this._layerReference.fidColumn();
        }).then(pFidColumn => {
            fidColumn = pFidColumn;
            return this._layerReference.layerName();
        }).then(pLayerName => {
            layerName = pLayerName;
            return this.tableName();
        }).then(pTableName => {
            return {
                tableName: pTableName,
                layerName: layerName,
                fidColumn: fidColumn,
                alias: this.tableAlias(layerName)
            }
        })
    }

    tableAlias(name) {
        return `l_${name}`;
    }

    /**
     * Layer names stored in mongo can have two distinct formats at least.
     * First of them is native for geonode and has format workspace:layerName where layerName incidentally is also a table name
     * @returns {*}
     */
    tableName() {
        var tableName;
        return this._layerReference.layerName().then(pLayerName => {
            tableName = pLayerName;
            return this._layerReference.layerWorkspace();
        }).then(workspace => {
            if (!tableName || !workspace) {
                throw new Error(
                    logger.error(`PgMongoLayerReference#tableName Error: layerName doesn't have table '${workspace}:${layerName}'`)
                );
            }

            // Do lookup for schema.
            return `${this.schemaName(workspace)}.${tableName}`;
        })
    }

    schemaName(workspaceName) {
        if (config.workspaceSchemaMap.hasOwnProperty(workspaceName)) {
            return config.workspaceSchemaMap[workspaceName];
        } else {
            throw new Error(
                logger.error(`PgMongoLayerReference#schemaName Error: Workspace name '${workspaceName}' is not defined in the configuration file.`)
            );
        }
    }
}

module.exports = PgMongoLayerReference;