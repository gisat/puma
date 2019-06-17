let _ = require('lodash');

let logger = require('../common/Logger').applicationWideLogger;

let PgRelation = require('../common/PgRelation');
let PgAttributeTypes = require('./PgAttributeTypes');


/**
 * This class is responsible for handling the PgAttributeDataSources created in the database.
 * @augments PgRelation
 */
class PgAttributeDataSources extends PgRelation {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgAttributeDataSource`);
    }

    /**
     * It doesn't create empty object as it doesn't have any meaning. This method creates the data_source reference and
     * a row in the table relevant for given type of resource.
     * @param dataSource {Object}
     * @param dataSource.typeId {Number} Id of the type represented by the relations.
     * @param dataSource.relationIds {Number[]} Relation identification.
     * @return {Promise}
     */
    create(dataSource) {
        this.validateDataSource(dataSource, 'create');

        return this.getDataSourceInfo(dataSource.typeId).then(attributeType => {
            let sql = dataSource.relationIds.map(relationId => `INSERT INTO ${this._schema}.${PgAttributeDataSources.tableName()} (type_id, ${attributeType}) 
                VALUES (${dataSource.typeId}, ${relationId});`).join(' ');

            logger.info(`${this._name}#create Sql: `, sql);
            return this._pool.query(sql);
        })
    }

    /**
     * @inheritDoc
     * @param dataSource {Object}
     * @param dataSource.typeId {Number} Id of the type represented by the relations.
     * @param dataSource.relations {Number[]} Ids of the relations to be removed.
     * @return {Promise}
     */
    delete(dataSource) {
        this.validateDataSource(dataSource, 'delete');

        return this._pool.query(`DELETE FROM ${this._schema}.${PgAttributeDataSources.tableName()} WHERE 
            type_id = ${dataSource.typeId} AND relation_id IN (${dataSource.relations.join(',')});`);
    }

    /**
     * Validates that all the received properties are valid and present.
     * @private
     * @throws {Error} When some of the properties are invalid or missing.
     */
    validateDataSource(dataSource, functionName) {
        if (!dataSource) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Data source must be provided.`)
            );
        }
        if (!dataSource.typeId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Id of the type of data source must be provided.`)
            );
        }
        if (!dataSource.relationIds || !_.isArray(dataSource.relationIds)) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Relation ids must be provided as an array. Relation IDS: `, dataSource.relationIds)
            );
        }
    }

    /**
     * Private function for retrieval of the information about the attribute type to decide how to store the received
     * information in this table.
     * @private
     * @param typeId {Number} Id of the type.
     * @returns {Promise|String} Name of the column to store the resources in.
     */
    getDataSourceInfo(typeId) {
        return this._pool.query(`SELECT * from ${this._schema}.${PgAttributeTypes.tableName()} WHERE id = ${typeId};`).then(result => {
            if(result.rows.length !== 1) {
                throw new Error(
                    logger.error(`${this._name}#getDataSourceInfo. Incorrect attribute types for type id. Amount: `, result.rows.length)
                );
            }

            return result.rows[0].col;
        })
    }

    static tableName() {
        return 'attribute_data_source';
    }
}

module.exports = PgAttributeDataSources;