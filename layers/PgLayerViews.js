var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

var PgBaseLayerTables = require('./PgBaseLayerTables');
var PgMongoLayerReference = require('./PgMongoLayerReference');

class PgLayerViews {
    constructor(pgPool) {
        this._pgPool = pgPool;
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
        return this._pgPool.query(`DROP VIEW ${schema}.${this.name(layerReferenceId)}`);
    }

    add(layerReferenceId, sourceTableName, fidColumn, nameColumn, parentColumn, dataLayerReferences = []) {
        if (!layerReferenceId || !fidColumn || !sourceTableName) {
            throw new Error(
                logger.error(`PgLayerViews Wrong parameters. layerReferenceId: ${layerReferenceId} fidColumn: ${fidColumn} sourceTableName: ${sourceTableName}`)
            );
        }

        var baseLayerName = PgBaseLayerTables.name(layerReferenceId);
        var schema = config.viewsSchema;
        nameColumn = nameColumn || fidColumn;

        var attributes;
        this.attributes().then(pAttributes => {
            attributes = pAttributes;
            return this.joinedDataTables()
        }).then(joinedDataTables => {
            var sql = `CREATE VIEW ${schema}.${PgLayerViews.name(layerReferenceId)} AS SELECT
                data.${fidColumn} AS gid,
                data.${nameColumn}::text AS name,
                ${this.parentColumn(parentColumn)},
                ${this.attributes()}
                baseTable.area,
                baseTable.length,
                baseTable.centroid,
                baseTable.extent,
                FROM ${sourceTableName} data
                LEFT JOIN ${schema}.${baseLayerName} baseTable ON data.${fidColumn}::text = baseTable.gid::text 
                ${this.joinedDataTables()}
            `;

            return this._pgPool.query(sql)
        }).then(() => {
            return this.addAttributes(dataLayerReferences, name);
        })
    }

    parentColumn(parentColumn) {
        if (parentColumn) {
            return `data.${parentColumn} AS parentgid`;
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
                    attributes += `${attribute.source} AS ${attribute.target},`;
                });
            });

            return attributes;
        });
    }

    joinedDataTables(dataLayerReferences) {
        var tables = [];

        dataLayerReferences.forEach(layerReference =>{
            tables.push(new PgMongoLayerReference(layerReference).table());
        });

        return Promise.all(tables).then(tables => {
            var sql = ``;
            tables.forEach(table => {
                sql += ` LEFT JOIN ${table.name} ON ${table.name}.${table.fidColumn}::text = baseTable.gid::text`;
            });

            return sql;
        });
    }

    static name(layerReferenceId) {
        return `layer_${layerReferenceId}`;
    }
}

module.exports = PgLayerViews;