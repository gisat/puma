var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

var PgBaseLayerTables = require('./PgBaseLayerTables');
var PgMongoLayerReference = require('./PgMongoLayerReference');

class PgLayerViews {
    constructor(pgPool, schema) {
        this._pgPool = pgPool;
        this.schema = schema;
    }

    update(layerReferenceId, sourceTableName, fidColumn, nameColumn, parentColumn, dataLayerReferences = []) {
        return this.remove(layerReferenceId).then(() => {
            return this.add(layerReferenceId, sourceTableName, fidColumn, nameColumn, parentColumn, dataLayerReferences);
        })
    }

    remove(layerReferenceId) {
        if(!layerReferenceId) {
            throw new Error(
                logger.error(`PgLayerViews#remove Wrong parameters: layerReferenceId: ${layerReferenceId}`)
            );
        }

        var schema = config.viewsSchema;
        return this._pgPool.pool().query(`DROP VIEW ${schema}.${this.name(layerReferenceId)}`);
    }

    // TODO: It wont work, when columns with same name from different tables are used.
    // So the difference is done byt he name of the table so what about actually using the name of the table.
    add(baseLayerReference, dataLayerReferences) {
        if (!baseLayerReference) {
            throw new Error(
                logger.error(`PgLayerViews Wrong parameters. layerReferenceId: ${baseLayerReference}`)
            );
        }

        let id, fidColumn, nameColumn, tableName, baseLayerName, parentColumn, attributes;
        let schema = this.schema;
        dataLayerReferences = dataLayerReferences || [];
		return baseLayerReference.id().then(pId => {
            id = pId;
            baseLayerName = PgBaseLayerTables.name(id);

            return baseLayerReference.parentColumn();
        }).then(pParentColumn => {
			parentColumn = pParentColumn;

			return baseLayerReference.layerName();
		}).then(pTableName => {
			tableName = pTableName;

			return baseLayerReference.nameColumn();
		}).then(pNameColumn => {
			nameColumn = pNameColumn;

			return baseLayerReference.fidColumn();
		}).then(pFidColumn => {
			fidColumn = pFidColumn;

			return this.attributes(dataLayerReferences)
		}).then(pAttributes => {
            attributes = pAttributes;
            return this.joinedDataTables(dataLayerReferences, tableName, fidColumn);
        }).then(joinedDataTables => {
            var sql = `CREATE VIEW ${schema}.${PgLayerViews.name(id)} AS SELECT
                l_${tableName}."${fidColumn}" AS gid,
                l_${tableName}."${nameColumn}"::text AS name,
                ${this.parentColumn(tableName, parentColumn)},
                ${attributes}
                baseTable.area,
                baseTable.length,
                baseTable.centroid,
                baseTable.extent
                FROM ${schema}.${baseLayerName} as baseTable
                 ${joinedDataTables};
            `;

            return this._pgPool.pool().query(sql)
        })
    }

    parentColumn(tableName, parentColumn) {
        if (parentColumn) {
            return `${tableName}."${parentColumn}" AS parentgid`;
        } else {
            return `NULL::integer AS parentgid`
        }
    }

    // TODO: Refactor and find a better solution for this.
    attributes(dataLayerReferences) {
        var promises = [];

        dataLayerReferences.forEach(layerReference =>{
            promises.push(new PgMongoLayerReference(layerReference).attributes());
        });

        return Promise.all(promises).then(results => {
            var attributes = ``;
            results.forEach(result =>{
                result.forEach(attribute => {
                    attributes += `${attribute.tableAlias}."${attribute.source}" AS ${attribute.target}, `;
                });
            });

            return attributes;
        });
    }

    joinedDataTables(dataLayerReferences, sourceTableName, fidColumn) {
        let tables = [];

        dataLayerReferences.forEach(layerReference =>{
            tables.push(new PgMongoLayerReference(layerReference).table());
        });

        return Promise.all(tables).then(tables => {
            let sql = ``;
			sql += ` LEFT JOIN ${sourceTableName} AS l_${sourceTableName} ON l_${sourceTableName}."${fidColumn}"::text = baseTable.gid::text`;
			tables.forEach(table => {
			    if(table.name == sourceTableName) {
			        return;
                }
                sql += ` LEFT JOIN ${table.name} AS ${table.alias} ON ${table.alias}."${table.fidColumn}"::text = baseTable.gid::text`;
            });

            return sql;
        });
    }

    static name(layerReferenceId) {
        return `layer_${layerReferenceId}`;
    }
}

module.exports = PgLayerViews;