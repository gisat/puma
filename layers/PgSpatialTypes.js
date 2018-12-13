let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgSpatialTypes created in the database.
 * @augments PgCollection
 */
class PgSpatialTypes extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgSpatialTypes`);
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

        return this._pgPool.query(`INSERT INTO ${this._pgSchema}.${PgSpatialTypes.tableName()} (id) VALUES (${id});`);
    }

    /**
     * @inheritDoc
     * @param id {Number} Id of the scope to update.
     * @param spatialType {Object}
     * @param spatialType.name {String} Name of the spatialType.
     * @param spatialType.col {String} Column where the relation is stored in the data_source table.
     */
    update(id, spatialType) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#update Id must be provided.`)
            );
        }
        if(!spatialType) {
            throw new Error(
                logger.error(`${this._name}#update Updated scope must be provided.`)
            );
        }

        let sql = ``;
        let changes = [];

        if(spatialType.name !== null) {
            changes.push(` name = '${spatialType.name}' `);
        }
        if(spatialType.col !== null) {
            changes.push(` col = '${spatialType.col}' `);
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._pgSchema}.${PgSpatialTypes.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
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

        return this._pgPool.query(`DELETE FROM ${this._pgSchema}.${PgSpatialTypes.tableName()} WHERE id = ${id} CASCADE`);
    }

    static tableName() {
        return 'spatial_type';
    }
}

module.exports = PgSpatialTypes;