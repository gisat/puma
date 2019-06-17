let logger = require('../common/Logger').applicationWideLogger;

let PgRelation = require('../common/PgRelation');

/**
 * This class is responsible for handling the PgSpatialRelations created in the database.
 * @alias PgSpatialRelations
 * @augments PgRelation
 */
class PgSpatialRelations extends PgRelation {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgSpatialRelations`);
    }

    /**
     * @inheritDoc
     * @param relation {Object} Relation to be created
     * @param relation.scopeId {Number} Id of the scope relevant for this combination
     * @param relation.periodId {Number} Id of the period relevant for this combination
     * @param relation.placeId {Number} Id of the place relevant for this combination
     * @param relation.scenarioId {Number} Id of the scenario relevant for this combination
     * @param relation.dataSourceId {Number} Id of the data source relevant for this combination
     *
     * @throws {Error}
     */
    create(relation) {
        this.validateRelation(relation);

        return this._pool.query(`INSERT INTO ${this._schema}.${PgSpatialRelations.tableName()} 
            (scope_id, period_id, place_id, scenario_id, data_source_id) VALUES 
            (${relation.scopeId}, ${relation.periodId}, ${relation.placeId}, ${relation.scenarioId}, ${relation.dataSourceId});`);
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
        if(!relation.scenarioId) {
            throw new Error(
                logger.error(`${this._name}#${functionName} Attribute must be specified.`)
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
     * @param relation.scenarioId {Number} Id of the scenario relevant for this combination
     * @param relation.dataSourceId {Number} Id of the data source relevant for this combination
     *
     * @throws {Error}
     */
    delete(relation) {
        this.validateRelation(relation);

        return this._pool.query(`DELETE FROM ${this._schema}.${PgSpatialRelations.tableName()} WHERE 
            scope_id = ${relation.scopeId} AND 
            period_id = ${relation.periodId} AND
            place_id = ${relation.placeId} AND
            scenario_id = ${relation.scenarioId}  AND
            data_source_id = ${relation.dataSourceId};`);
    }

    static tableName() {
        return 'spatial_relation';
    }
}

module.exports = PgSpatialRelations;