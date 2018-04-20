let logger = require('../common/Logger').applicationWideLogger;

/**
 * Generic class that is used throughout the application. It represents a collection of metadata items stored in the
 * PostgreSQL database.
 */
class PgCollection {
    /**
     * @param pool {PgPool} Database Connection Pool used to handle the requests.
     * @param schema {String} Schema containing data tables.
     * @param name {String} Name of this instance of Collection stored in PostgreSQL.
     */
    constructor(pool, schema, name) {
        this._pool = pool;
        this._schema = schema;
        this._name = name;
    }

    /**
     * It should create empty object with provided id.
     * @param id {Number} Id of the given object.
     * @param userId {Number} Id of the User requesting the operation
     */
    create(id, userId) {
        if(!userId) {
            throw new Error(
                logger.error(`PgCollection#create Name: ${this._name} User id must be specified.`)
            );
        }
        if(!id) {
            throw new Error(
                logger.error(`PgCollection#create Name: ${this._name} Id must be provided.`)
            );
        }

        return this._pool.query(`
            INSERT INTO ${this._schema}.audit (action, user_id) 
                VALUES ('Create ${this._name} with id: ${id}', ${userId})
        `);
    }

    /**
     * It should update the object properties.
     * @param id {Number} Id of the object to be updated
     * @param object {Object} Collection of object properties to be updated.
     * @param userId {Number} Id of the user asking for the operation on the collection.
     */
    update(id, object, userId) {
        if(!userId) {
            throw new Error(
                logger.error(`PgCollection#update Name: ${this._name} User id must be specified.`)
            );
        }
        if(!id) {
            throw new Error(
                logger.error(`PgCollection#update Name: ${this._name} Id must be provided.`)
            );
        }
        if(!object) {
            throw new Error(
                logger.error(`PgCollection#update Name: ${this._name} Updated object must be provided.`)
            );
        }

        return this._pool.query(`
            INSERT INTO ${this._schema}.audit (action, user_id) 
                VALUES ('Update ${this._name} with id: ${id} and value: ${object}', ${userId})
        `);
    }

    /**
     * It should delete project with given id and all its dependencies. At this layer we expect the user to have the
     * privileges to do so.
     * @param id {Number} Id of the object to be deleted.
     * @param userId {Number} Id of the user trying to perform the delete action.
     */
    delete(id, userId) {
        if(!userId) {
            throw new Error(
                logger.error(`PgCollection#delete Name: ${this._name} User id must be specified.`)
            );
        }
        if(!id) {
            throw new Error(
                logger.error(`PgCollection#delete Name: ${this._name} Id must be provided.`)
            );
        }

        return this._pool.query(`
            INSERT INTO ${this._schema}.audit (action, user_id) 
                VALUES ('Delete ${this._name} with id: ${id}', ${userId})
        `);
    }
}

module.exports = PgCollection;