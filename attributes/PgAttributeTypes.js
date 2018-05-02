let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgAttributeTypes created in the database.
 * @augments PgCollection
 */
class PgAttributeTypes extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgAttributeTypes`);
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

        return this._pool.query(`INSERT INTO ${this._schema}.${PgAttributeTypes.tableName()} (id) VALUES (${id});`);
    }

    /**
     * @inheritDoc
     * @param id {Number} Id of the scope to update.
     * @param attributeType {Object}
     * @param attributeType.name {String} Name of the attributeType.
     * @param attributeType.col {String} Column where the relation is stored in the data_source table.
     */
    update(id, attributeType) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#update Id must be provided.`)
            );
        }
        if(!attributeType) {
            throw new Error(
                logger.error(`${this._name}#update Updated scope must be provided.`)
            );
        }

        let sql = ``;
        let changes = [];

        if(attributeType.name !== null) {
            changes.push(` name = '${attributeType.name}' `);
        }
        if(attributeType.col !== null) {
            changes.push(` col = '${attributeType.col}' `);
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._schema}.${PgAttributeTypes.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }

        logger.info(`PgAttributes#update SQL: ${sql}`);
        return this._pool.query(sql);
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

        return this._pool.query(`DELETE FROM ${this._schema}.${PgAttributeTypes.tableName()} WHERE id = ${id} CASCADE`);
    }

    static tableName() {
        return 'attribute_type';
    }
}

module.exports = PgAttributeTypes;