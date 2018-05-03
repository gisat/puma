let logger = require('../common/Logger').applicationWideLogger;

let PgRelation = require('../common/PgRelation');

/**
 * This class is responsible for handling the PgAttributeRelations created in the database.
 * @alias PgAttributeRelations
 * @augments PgRelation
 */
class PgAttributeRelations extends PgRelation {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgAttributeRelations`);
    }

    /**
     * @inheritDoc
     * @param relation {Object} Relation to be created
     * @param relation.scopeId {Number} Id of the scope relevant for this combination
     * @param relation.periodId {Number} Id of the period relevant for this combination
     * @param relation.placeId {Number} Id of the place relevant for this combination
     * @param relation.attributeId {Number} Id of the attribute relevant for this combination
     * @param relation.attributeSetId {Number} Id of the attribute set relevant for this combination
     * @param relation.dataSourceId {Number} Id of the data source relevant for this combination
     *
     * @throws {Error}
     */
    create(relation) {
        this.validateRelation(relation);

        return this._pool.query(`INSERT INTO ${this._schema}.${PgAttributeRelations.tableName()} 
            (scope_id, period_id, place_id, attribute_id, attribute_set_id, data_source_id) VALUES 
            (${relation.scopeId}, ${relation.periodId}, ${relation.placeId}, ${relation.attributeId}, 
            ${relation.attributeSetId}, ${relation.dataSourceId});`);
    }

    /**
     * Validates that the received relation contains all necessary information.
     * @private
     */
    validateRelation(relation, functionName) {
        if(!relation) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Relation must be specified.`)
            );
        }
        if(!relation.scopeId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Scope must be specified.`)
            );
        }
        if(!relation.periodId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Period must be specified.`)
            );
        }
        if(!relation.placeId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Place must be specified.`)
            );
        }
        if(!relation.attributeId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Attribute must be specified.`)
            );
        }
        if(!relation.attributeSetId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Attribute set must be specified.`)
            );
        }
        if(!relation.dataSourceId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Data source must be specified.`)
            );
        }
    }

    /**
     * @inheritDoc
     * @param relation {Object} Relation to be removed.
     * @param relation.scopeId {Number} Id of the scope relevant for this combination
     * @param relation.periodId {Number} Id of the period relevant for this combination
     * @param relation.placeId {Number} Id of the place relevant for this combination
     * @param relation.attributeId {Number} Id of the attribute relevant for this combination
     * @param relation.attributeSetId {Number} Id of the attribute set relevant for this combination
     * @param relation.dataSourceId {Number} Id of the data source relevant for this combination
     *
     * @throws {Error}
     */
    delete(relation) {
        this.validateRelation(relation);

        return this._pool.query(`DELETE FROM ${this._schema}.${PgAttributeRelations.tableName()} WHERE 
            scope_id = ${relation.scopeId} AND 
            period_id = ${relation.periodId} AND
            place_id = ${relation.placeId} AND
            attribute_id = ${relation.attributeId} AND
            attribute_set_id = ${relation.attributeSetId} AND
            data_source_id = ${relation.dataSourceId};`);
    }

    static tableName() {
        return 'attribute_relation';
    }
}

module.exports = PgAttributeRelations;