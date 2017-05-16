var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');
let conn = require('../common/conn');

var PgBaseLayerTables = require('./PgBaseLayerTables');
var PgMongoLayerReference = require('./PgMongoLayerReference');
let MongoLayerReference = require('./MongoLayerReference');

/**
 * This class represents the views for simplification of requests to the various data source tables.
 */
class PgLayerViews {
	/**
     * It creates instance representing the views simplifying the querying through the data tables. There is one view
     * per layer reference which doesn't contain data and is therefore known as Base Layer. This view then contains
     * geometries and ids of all the polygons with columns representing the columns in the data layers.
	 * @param pgPool {PgPool} Pool for the PostgreSQL.
	 * @param sourceSchema {String} Optional. Name of the schema which contains the tables to load data from. Usually public
	 * @param targetSchema {String} Optional. Name of the schema where the views should be created. Usually views.
	 */
	constructor(pgPool, targetSchema, sourceSchema) {
        this._pgPool = pgPool;

        this.targetSchema = targetSchema || 'views';
		this.sourceSchema = sourceSchema || 'public';
	}

	/**
     * It removes the view from the database. The layerReferenceId is part of the name of the view. The structure is
     * layer_{layerReferenceId}
	 * @param layerReferenceId {Number} Id of the base layer.
	 * @param dataLayerReferences {MongoLayerReference[]} Layers which contains the data.
	 */
    update(layerReferenceId, dataLayerReferences = []) {
        return this.remove(layerReferenceId).then(() => {
            return this.add(new MongoLayerReference(layerReferenceId, conn.getMongoDb()), dataLayerReferences);
        })
    }

    addOnly(layerReferenceId, dataLayerReferences = []) {
        return this.add(new MongoLayerReference(layerReferenceId, conn.getMongoDb()), dataLayerReferences);
    }

	/**
     * It removes view with the given Id.
	 * @param layerReferenceId {Number} Id of the base layer.
	 */
	remove(layerReferenceId) {
        if(!layerReferenceId) {
            throw new Error(
                logger.error(`PgLayerViews#remove Wrong parameters: layerReferenceId: ${layerReferenceId}`)
            );
        }
        
        return this._pgPool.pool().query(`DROP VIEW IF EXISTS ${this.targetSchema}.${PgLayerViews.name(layerReferenceId)}`);
    }

    // TODO: It wont work, when columns with same name from different tables are used.
	/**
     * It adds the view representing base layer with all the data.
	 * @param baseLayerReference {MongoLayerReference} Id of the base layer.
	 * @param dataLayerReferences {MongoLayerReference[]} Layers containing the data.
	 */
	add(baseLayerReference, dataLayerReferences) {
        if (!baseLayerReference) {
            throw new Error(
                logger.error(`PgLayerViews Wrong parameters. layerReferenceId: ${baseLayerReference}`)
            );
        }

        let id, fidColumn, nameColumn, sourceTable, baseLayerName, parentColumn, attributes;
        dataLayerReferences = dataLayerReferences || [];
		return baseLayerReference.id().then(pId => {
            id = pId;
            baseLayerName = PgBaseLayerTables.name(id);

            return baseLayerReference.parentColumn();
        }).then(pParentColumn => {
            parentColumn = pParentColumn;
            
            return new PgMongoLayerReference(baseLayerReference).table();
        }).then(pSourceTable => {
            sourceTable = pSourceTable;
            
            return baseLayerReference.nameColumn();
        }).then(pNameColumn => {
            nameColumn = pNameColumn;
            
            return this.attributes(dataLayerReferences)
        }).then(pAttributes => {
            attributes = pAttributes;
            return this.joinedDataTables(dataLayerReferences, sourceTable);
        }).then(joinedDataTables => {
			let sql = `CREATE VIEW ${this.targetSchema}.${PgLayerViews.name(id)} AS SELECT
                ${sourceTable.alias}."${sourceTable.fidColumn}" AS gid,
                ${this.nameColumn(sourceTable, nameColumn)},
                ${sourceTable.alias}."the_geom" AS the_geom,
                ${this.parentColumn(sourceTable, parentColumn)},
                ${attributes}
                baseTable.area,
                baseTable.length,
                baseTable.centroid,
                baseTable.extent
                FROM ${this.targetSchema}.${baseLayerName} as baseTable
                 ${joinedDataTables};
            `;
			logger.info(`PgLayerViews#add SQL: `, sql);

            return this._pgPool.pool().query(sql)
        }).then(result => {
        	logger.info(`PgLayerViews#add Added: ${id}`);
        	return result;
		});
    }

    nameColumn(sourceTable, nameColumn) {
		if(nameColumn) {
			return `${sourceTable.alias}."${nameColumn}"::text AS name`;
		} else {
			return `NULL::integer AS name`;
		}
	}

    parentColumn(sourceTable, parentColumn) {
        if (parentColumn) {
            return `${sourceTable.alias}."${parentColumn}" AS parentgid`;
        } else {
            return `NULL::integer AS parentgid`;
        }
    }

    // TODO: Refactor and find a better solution for this.
    attributes(dataLayerReferences) {
        let promises = [];

        dataLayerReferences.forEach(layerReference =>{
            promises.push(new PgMongoLayerReference(layerReference).attributes());
        });

        return Promise.all(promises).then(results => {
			let attributes = ``;
            results.forEach(result =>{
                result.forEach(attribute => {
                    attributes += `${attribute.tableAlias}."${attribute.source}" AS ${attribute.target}, `;
                });
            });

            return attributes;
        });
    }

    joinedDataTables(dataLayerReferences, sourceTable) {
        let tables = [];

        dataLayerReferences.forEach(layerReference =>{
            tables.push(new PgMongoLayerReference(layerReference).table());
        });

        return Promise.all(tables).then(tables => {
            let sql = ``;
            sql += ` LEFT JOIN ${sourceTable.tableName} AS ${sourceTable.alias} ON ${sourceTable.alias}."${sourceTable.fidColumn}"::text = baseTable.gid::text`;
            tables.forEach(table => {
                if (table.layerName === sourceTable.layerName) {
                    return;
                }
                sql += ` LEFT JOIN ${table.tableName} AS ${table.alias} ON ${table.alias}."${table.fidColumn}"::text = baseTable.gid::text`;
            });

            return sql;
        });
    }

    static name(layerReferenceId) {
        return `layer_${layerReferenceId}`;
    }
}

module.exports = PgLayerViews;