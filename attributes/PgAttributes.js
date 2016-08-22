var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

/**
 * @alias PgAttributes
 * @param connectionPool {PgPool} Pool of the connections.
 * @param schema {String} Name of the used Schema.
 * @constructor
 */
var PgAttributes = function (connectionPool, schema) {

    if(!connectionPool || !schema) {
        throw new Error(
            logger.error('PgAttributes#constructor It is necessary to provide the connectionPool and Schema')
        );
    }

    this._connectionPool = connectionPool;
    this._pool = connectionPool.pool();
    this._schema = schema;
};

/**
 * @inheritDoc
 */
PgAttributes.prototype.all = function (params) {
    var table = this._schema + ".layer_" + params.layer;

    return this._pool.query('select MAX(as_' + params.attrSet + '_attr_' + params.attr +'), MIN(as_' + params.attrSet + '_attr_' + params.attr +') from ' + table).then(function (results) {
        return results.rows;
    }).catch(function (err) {
        logger.error("PgAttributes#all Error when querying the database. Error: ", err);
    });
};

module.exports = PgAttributes;