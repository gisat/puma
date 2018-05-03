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
     * @param id {Number} Id of the given object.
     */
    create(id) {}

    /**
     * It should update the object properties.
     * @param id {Number} Id of the object to be updated
     * @param object {Object} Collection of object properties to be updated.
     */
    update(id, object) {}

    /**
     * It should delete project with given id and all its dependencies. At this layer we expect the user to have the
     * privileges to do so.
     * @param id {Number} Id of the object to be deleted.
     */
    delete(id) {}
}

module.exports = PgCollection;