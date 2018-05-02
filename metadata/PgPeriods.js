let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgPeriods created in the database. It is a low level API class.
 * @augments PgCollection
 */
class PgPeriods extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgPeriods`);
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

        return this._pool.query(`INSERT INTO ${this._schema}.${PgPeriods.tableName()} (id) VALUES (${id});`);
    }

    /**
     * There is difference between null and undefined/empty value. Empty value does change the result. null/undefined
     * ignores the property.
     * @param id {Number} Id of the scope to update.
     * @param period {Object}
     * @param period.name {String} Name of the period.
     */
    update(id, period) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#update Id must be provided.`)
            );
        }
        if(!period) {
            throw new Error(
                logger.error(`${this._name}#update Updated object must be provided.`)
            );
        }

        if(period.name !== null) {
            let sql = ``;
            let changes = [];

            if(period.name !== null) {
                changes.push(` name = '${name}' `);
            }

            sql += `UPDATE ${this._schema}.${PgPeriods.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;

            logger.info(`PgPeriods#update SQL: ${sql}`);
            return this._pool.query(sql)
        }
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
        
        return this._pool.query(`DELETE FROM ${this._schema}.${PgPeriods.tableName()} WHERE id = ${id} CASCADE;`);
    }

    static tableName() {
        return 'period';
    }
}

module.exports = PgPeriods;