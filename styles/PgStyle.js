var Style = require('./Style');

var util = require('util');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * @alias PgStyle
 * @augments Style
 * @param id {String} Unique identifier of this style.
 * @param connectionPool {PgPool} Pool of connections which allows me to retrieve one.
 * @param schema {String} Schema in which current objects live.
 * @constructor
 */
var PgStyle = function(connectionPool, id, schema) {
	Style.call(this);

	if(!connectionPool || !id) {
		throw new Error(
			logger.error('PgStyle#constructor Connection pool or id wasn\'t supplied')
		);
	}

	/**
	 * It contains the connection pool used for querying the user.
	 * @type {pg.Pool}
	 * @private
	 */
	this._connection = connectionPool.pool();

	/**
	 * It contains the name of the table associated with this object.
	 * @type {String}
	 * @private
	 */
	this._tableName = schema + '.style';

	/**
	 * Id of current object.
	 * @type {String}
	 * @private
	 */
	this._id = id;
};

PgStyle.prototype = Object.create(Style.prototype);

/**
 * @inheritDoc
 */
PgStyle.prototype.id = function(){
	return this.loadAttribute('id');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.definition = function() {
	return this.loadAttribute('definition');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.name = function() {
	return this.loadAttribute('name');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.sld = function() {
	return this.loadAttribute('sld');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.symbologyName = function() {
	return this.loadAttribute('symbology_name');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.changed = function() {
	return this.loadAttribute('changed');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.changedBy = function() {
	return this.loadAttribute('changed_by');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.created = function() {
	return this.loadAttribute('created');
};

/**
 * @inheritDoc
 */
PgStyle.prototype.createdBy = function() {
	return this.loadAttribute('created_by');
};

PgStyle.prototype.loadAttribute = function(name) {
	var query = util.format("SELECT %s from %s where id=$1", name, this._tableName);

	return this._connection.query(query, [this._id]).then(function(result){
		return result.rows[0][name];
	});
};

module.exports = PgStyle;