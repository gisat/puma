let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgPeriods created in the database.
 * @augments PgCollection
 */
class PgPeriods extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, PgPeriods.tableName());
    }

    /**
     * @inheritDoc
     */
    create(id, userId) {
        return super.create(id, userId).then(() => {
            return this._pool.query(`INSERT INTO ${this._schema}.${PgPeriods.tableName()} (id) VALUES (${id})`);
        });
    }

    /**
     * There is difference between null and undefined/empty value. Empty value does change the result. null/undefined
     * ignores the property.
     * @param id {Number} Id of the scope to update.
     * @param period {Object}
     * @param period.name {String} Name of the period.
     * @param userId {Number} Id of the User requesting the update.
     */
    update(id, period, userId) {
        return super.update(id, period, userId).then(() => {
            if(period.name !== null) {
                let sql = `BEGIN TRANSACTION; `;
                let changes = [];

                if(period.name !== null) {
                    changes.push(` name = '${name}' `);
                }

                sql += `UPDATE ${this._schema}.${PgPeriods.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
                sql += `COMMIT; `;

                logger.info(`PgPeriods#update SQL: ${sql}`);
                return this._pool.query(sql)
            }
        }).catch(err => {
            logger.error(`PgPeriods#update ERROR: `, err);
            return this._pool.query(`ROLLBACK`);
        });
    }

    /**
     * @inheritDoc
     */
    delete(id, userId) {
        return super.delete(id, userId).then(() => {
            return this._pool.query(`DELETE FROM ${this._schema}.${PgPeriods.tableName()} WHERE id = ${id} CASCADE;`);
        });
    }

    static tableName() {
        return 'period';
    }
}

module.exports = PgPeriods;