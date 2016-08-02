var pg = require('pg');

/**
 * This class represents pool of PostgreSQL connections.
 * It returns Promise of connection in order to simplify further work.
 * @alias PgPool
 * @param config {Object}
 * @param config.user {String} User under which we should connect to the database.
 * @param config.database {String} Name of the database to which we connect.
 * @param config.password {String} Password under which we connect to the database.
 * @param config.host {String} Host on which the databse runs.
 * @param config.port {Number} Optional. Port on which the database listens.
 * @param config.max {Number} Optional. Maximum amount of simultaneous connections.
 * @param config.idleTimeoutLimits {Number} Optional. idle milliseconds before the client is closed.
 * @constructor
 */
var PgPool = function(config) {
	config.max = config.max || 10;
	config.idleTimeoutLimits = config.idleTimeoutLimits || 30000;
	config.port = config.port || 5432;

	this._pool = new pg.Pool(config);
};

/**
 * It returns configured instance of Pool.
 * @returns {pg.Pool}
 */
PgPool.prototype.pool = function(){
	return this._pool;
};

module.exports = PgPool;