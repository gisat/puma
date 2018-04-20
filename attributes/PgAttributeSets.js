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
        super(pool, schema);
    }

    /**
     * It creates empty scope.
     * @param id {Number}
     */
    create(id) {
        return this._pool.query(`INSERT INTO ${this._schema}.${PgAttributeSets.tableName()} (id) VALUES (${id})`);
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
        if(!id) {
            throw new Error(
                logger.error(`PgAttributeSets#update Id must be provided.`)
            );
        }
        if(!attributeSet) {
            throw new Error(
                logger.error(`PgAttributeSets#update Updated scope must be provided.`)
            );
        }
        if(attributeSet.featureLayers && !_.isArray(attributeSet.featureLayers)) {
            throw new Error(
                logger.error(`PgAttributeSets#update Analytical units must be either null or array.`)
            );
        }
        if(attributeSet.attributes && !_.isArray(attributeSet.attributes)) {
            throw new Error(
                logger.error(`PgAttributeSets#update Attributes must be either null or array.`)
            );
        }

        let sql = `BEGIN TRANSACTION; `;
        let changes = [];

        if(attributeSet.name !== null) {
            changes.push(` name = '${attributeSet.name}' `);
        }
        if(attributeSet.topic !== null) {
            changes.push(` topic = ${attributeSet.topic} `);
        }
        if(attributeSet.featureLayers !== null) {
            sql += ` DELETE FROM ${this._schema}.${PgAttributeSets.analyticalUnits()} WHERE attribute_set_id = ${id}; `;
            sql += attributeSet.featureLayers.map(analyticalUnitLevel =>
                ` INSERT INTO ${this._schema}.${PgAttributeSets.analyticalUnits()} (scope_id, analytical_unit_id) VALUES (${id}, ${analyticalUnitLevel}); `
            );
        }
        if(attributeSet.attributes !== null) {
            sql += ` DELETE FROM ${this._schema}.${PgAttributeSets.attributes()} WHERE attribute_set_id = ${id}; `;
            sql += attributeSet.attributes.map(atribute =>
                ` INSERT INTO ${this._schema}.${PgAttributeSets.attributes()} (scope_id, period_id) VALUES (${id}, ${atribute}); `
            );
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._schema}.${PgAttributeSets.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }
        sql += `COMMIT; `;

        logger.info(`PgAttributeSets#update SQL: ${sql}`);
        return this._pool.query(sql).catch(err => {
            logger.error(`PgAttributeSets#update ERROR: `, err);
            return this._pool.query(`ROLLBACK`);
        })
    }

    /**
     * It simply deletes row with given ID. Cascading to all relevant tables.
     * @param id {Number}
     * @return {*}
     */
    delete(id) {
        return this._pool.query(`DELETE FROM ${this._schema}.${PgAttributeSets.tableName()} WHERE id = ${id} CASCADE`);
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