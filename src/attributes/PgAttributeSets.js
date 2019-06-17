let _ = require('underscore');
let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgAttributeSets created in the database.
 * @augments PgCollection
 */
class PgAttributeSets extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgAttributeSets`);
    }

    /**
     * It creates empty scope.
     * @param id {Number}
     */
    create(id) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#create Id must be provided.`)
            );
        }

        return this._pgPool.query(`INSERT INTO ${this._pgSchema}.${PgAttributeSets.tableName()} (id) VALUES (${id});`);
    }

    /**
     * There is difference between null and undefined/empty value. Empty value does change the result. null/undefined
     * ignores the property.
     * @param id {Number} Id of the attributeSet to update.
     * @param attributeSet {Object}
     * @param attributeSet.featureLayers {Number[]} Ordered ids of the analytical units levels
     * @param attributeSet.attributes {Number[]} Ids of the attributes relevant for the attributeSet.
     * @param attributeSet.name {String} Name of the attributeSet
     * @param attributeSet.topic {Number} Id of the topic associated with the attribute set.
     */
    update(id, attributeSet) {
        this.verifyUpdate(id, attributeSet);

        let sql = ``;
        let changes = [];

        if(attributeSet.name !== null) {
            changes.push(` name = '${attributeSet.name}' `);
        }
        if(attributeSet.topic !== null) {
            changes.push(` topic = ${attributeSet.topic} `);
        }
        if(attributeSet.featureLayers !== null) {
            sql += ` DELETE FROM ${this._pgSchema}.${PgAttributeSets.analyticalUnits()} WHERE attribute_set_id = ${id}; `;
            sql += attributeSet.featureLayers.map(analyticalUnitLevel =>
                ` INSERT INTO ${this._pgSchema}.${PgAttributeSets.analyticalUnits()} (scope_id, analytical_unit_id) VALUES (${id}, ${analyticalUnitLevel}); `
            );
        }
        if(attributeSet.attributes !== null) {
            sql += ` DELETE FROM ${this._pgSchema}.${PgAttributeSets.attributes()} WHERE attribute_set_id = ${id}; `;
            sql += attributeSet.attributes.map(attribute =>
                ` INSERT INTO ${this._pgSchema}.${PgAttributeSets.attributes()} (scope_id, period_id) VALUES (${id}, ${attribute}); `
            );
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._pgSchema}.${PgAttributeSets.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }

        logger.info(`PgAttributeSets#update SQL: ${sql}`);
        return this._pgPool.query(sql);
    }

    /**
     * Private verification that all necessary inputs for update were provided.
     * @private
     */
    verifyUpdate(id, attributeSet) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#update Id must be provided.`)
            );
        }
        if(!attributeSet) {
            throw new Error(
                logger.error(`${this._name}#update Updated scope must be provided.`)
            );
        }
        if(attributeSet.featureLayers && !_.isArray(attributeSet.featureLayers)) {
            throw new Error(
                logger.error(`${this._name}#update Analytical units must be either null or array.`)
            );
        }
        if(attributeSet.attributes && !_.isArray(attributeSet.attributes)) {
            throw new Error(
                logger.error(`${this._name}#update Attributes must be either null or array.`)
            );
        }
    }

    /**
     * It simply deletes row with given ID. Cascading to all relevant tables.
     * @param id {Number}
     * @return {*}
     */
    delete(id) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#delete Id must be provided.`)
            );
        }

        return this._pgPool.query(`DELETE FROM ${this._pgSchema}.${PgAttributeSets.tableName()} WHERE id = ${id} CASCADE`);
    }

    static tableName() {
        return 'attribute_set';
    }

    static analyticalUnits() {
        return 'attribute_set_has_analytical_unit_level';
    }

    static attributes() {
        return 'attribute_set_has_attribute';
    }
}

module.exports = PgAttributeSets;