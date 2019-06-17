let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgAttributes created in the database.
 * @augments PgCollection
 */
class PgAttributes extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgAttributes`);
    }

    /**
     * @inheritDoc
     */
    create(id) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#create Id must be provided.`)
            );
        }

        return this._pgPool.query(`INSERT INTO ${this._pgSchema}.${PgAttributes.tableName()} (id) VALUES (${id});`);
    }

    /**
     * @inheritDoc
     * @param id {Number} Id of the scope to update.
     * @param attribute {Object}
     * @param attribute.name {String} Name of the attribute.
     * @param attribute.type {String} Numeric, Text or Boolean. Type of attribute represents how it should be handled.
     * @param attribute.standardUnits {String} The areal units suchs as m2, km2, ha
     * @param attribute.units {String} Custom units to be used that aren't area based. These are just updated.
     * @param attribute.color {String} Hex code representing the color of this attribute.
     */
    update(id, attribute) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#update Id must be provided.`)
            );
        }
        if(!attribute) {
            throw new Error(
                logger.error(`${this._name}#update Updated object must be provided.`)
            );
        }

        let sql = ``;
        let changes = [];

        if(attribute.name !== null) {
            changes.push(` name = '${attribute.name}' `);
        }
        if(attribute.type !== null) {
            changes.push(` type = '${attribute.type}' `);
        }
        if(attribute.standardUnits !== null) {
            changes.push(` standard_units = '${attribute.standardUnits}' `);
        }
        if(attribute.units !== null) {
            changes.push(` units = '${attribute.units}' `);
        }
        if(attribute.color !== null) {
            changes.push(` color = '${attribute.color}' `);
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._pgSchema}.${PgAttributes.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }

        logger.info(`PgAttributes#update SQL: ${sql}`);
        return this._pgPool.query(sql);
    }

    /**
     * @inheritDoc
     */
    delete(id) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#delete Id must be provided.`)
            );
        }
        
        return this._pgPool.query(`DELETE FROM ${this._pgSchema}.${PgAttributes.tableName()} WHERE id = ${id} CASCADE`);
    }

    static tableName() {
        return 'attribute';
    }
}

module.exports = PgAttributes;