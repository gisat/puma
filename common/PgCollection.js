/**
 * Generic class that is used throughout the application. It represents a collection of metadata items stored in the
 * PostgreSQL database. It is basically an interface specifying default operation that must be possible on every collection.
 * The collection isn't equal to table. There will be relations represented as tables in the database, which won't
 * be represented by this interface.
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
	 * @param object {Object} Collection of object properties to be created.
	 */
    create(object, user) {}

    /**
     * It should update the object properties.
     * @param object [{Object}] List of collection of object properties to be updated.
     */
    update(object, user) {}

    /**
     * It should delete project with given id and all its dependencies. At this layer we expect the user to have the
     * privileges to do so.
     * @param object [{Object}] List of collection of object properties to be deleted.
     */
    delete(object, user) {}
}

module.exports = PgCollection;