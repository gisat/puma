let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgWms created in the database.
 * @augments PgCollection
 */
class PgWms extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgWms`);
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

        return this._pool.query(`INSERT INTO ${this._schema}.${PgWms.tableName()} (id) VALUES (${id});`);
    }

    /**
     * @inheritDoc
     * @param id {Number} Id of the scope to update.
     * @param postgisTable {Object}
     * @param postgisTable.name {String} Name of the wms layer.
     * @param postgisTable.url {String} Url of the Layer.
     * @param postgisTable.layer {String} Name of the layer as perceived on the server.
     * @param postgisTable.custom {String} custom wms parameters.
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
        if(postgisTable.url !== null) {
            changes.push(` url = '${postgisTable.url}' `);
        }
        if(postgisTable.layer !== null) {
            changes.push(` layer = '${postgisTable.layer}' `);
        }
        if(postgisTable.custom !== null) {
            changes.push(` custom = '${postgisTable.custom}' `);
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._schema}.${PgWms.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }
        sql += ``;

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

        return this._pool.query(`DELETE FROM ${this._schema}.${PgWms.tableName()} WHERE id = ${id} CASCADE;`);
    }

    static tableName() {
        return 'wms';
    }
}

module.exports = PgWms;