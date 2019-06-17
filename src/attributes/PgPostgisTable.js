let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgPostgisTable created in the database.
 * @augments PgCollection
 */
class PgPostgisTable extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgPostgisTable`);
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

        return this._pgPool.query(`INSERT INTO ${this._pgSchema}.${PgPostgisTable.tableName()} (id) VALUES (${id});`);
    }

    /**
     * @inheritDoc
     * @param id {Number} Id of the scope to update.
     * @param postgisTable {Object}
     * @param postgisTable.name {String} Name of the postgisTable.
     * @param postgisTable.col {String} Name of the column associated with the given attribute.
     */
    update(id, postgisTable) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#update Id must be provided.`)
            );
        }
        if(!postgisTable) {
            throw new Error(
                logger.error(`${this._name}#update Updated scope must be provided.`)
            );
        }

        let sql = ``;
        let changes = [];

        if(postgisTable.name !== null) {
            changes.push(` name = '${postgisTable.name}' `);
        }
        if(postgisTable.col !== null) {
            changes.push(` col = '${postgisTable.col}' `);
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._pgSchema}.${PgPostgisTable.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }
        sql += ``;

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

        return this._pgPool.query(`DELETE FROM ${this._pgSchema}.${PgPostgisTable.tableName()} WHERE id = ${id} CASCADE;`);
    }

    static tableName() {
        return 'postgis_table';
    }
}

module.exports = PgPostgisTable;