let logger = require('../common/Logger').applicationWideLogger;

let PgCollection = require('../common/PgCollection');

/**
 * This class is responsible for handling the PgPlaces created in the database.
 * @augments PgCollection
 */
class PgPlaces extends PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     */
    constructor(pool, schema) {
        super(pool, schema, `PgPlaces`);
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

        return this._pool.query(`INSERT INTO ${this._schema}.${PgPlaces.tableName()} (id) VALUES (${id});`);
    }

    /**
     * There is difference between null and undefined/empty value. Empty value does change the result. null/undefined
     * ignores the property.
     * @param id {Number} Id of the place to update.
     * @param place {Object}
     * @param place.name {String} Name of the place
     * @param place.bbox {String} Bbox associated with given place.
     * @param place.dataset {String} Scope of the place
     */
    update(id, place) {
        if(!id) {
            throw new Error(
                logger.error(`${this._name}#update Id must be provided.`)
            );
        }
        if(!place) {
            throw new Error(
                logger.error(`${this._name}#update Updated object must be provided.`)
            );
        }

        let sql = ``;
        let changes = [];

        if(place.name !== null) {
            changes.push(` name = '${name}' `);
        }
        if(place.bbox !== null) {
            changes.push(` bbox = ${place.bbox} `);
        }
        if(place.dataset !== null) {
            changes.push(` dataset = ${place.dataset} `);
        }

        if(changes.length > 0) {
            sql += `UPDATE ${this._schema}.${PgPlaces.tableName()} SET ${changes.join(',')} WHERE id = ${id}; `;
        }

        logger.info(`PgPlaces#update SQL: ${sql}`);
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

        return this._pool.query(`DELETE FROM ${this._schema}.${PgPlaces.tableName()} WHERE id = ${id} CASCADE`);
    }

    static tableName() {
        return 'place';
    }
}

module.exports = PgPlaces;