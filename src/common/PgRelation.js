/**
 * It represents interface for the Relations. Some of the relations are complex enough to be supported by their own
 * class. In such cases they should implement this interface.
 */
class PgRelation {
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
     * This method should create given Relation with necessary dependencies.
     * @param relation {Object}
     */
    create(relation) {}

    /**
     * This should delete relation and all dependencies. The object may contain multiple filtering values for what
     * relations will be deleted.
     * @param relation {Object}
     */
    delete(relation) {}
}

module.exports = PgRelation;