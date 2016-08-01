var Styles = require('./Styles');
var PgStyle = require('./PgStyle');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

/**
 * @alias PgStyles
 * @augments Styles
 * @param connectionPool {PgPool} Pool of the connections.
 * @param schema {String} Name of the used Schema.
 * @constructor
 */
var PgStyles = function (connectionPool, schema) {
	Styles.call(this);

	if(!connectionPool || !schema) {
		throw new Error(
			logger.error('PgStyles#constructor It is necessary to provide the connectionPool and Schema')
		);
	}

	this._connectionPool = connectionPool;
	this._pool = connectionPool.pool();
	this._schema = schema;
	this._table = this._schema + ".style";
};

PgStyles.prototype = Object.create(Styles.prototype);

/**
 * @inheritDoc
 */
PgStyles.prototype.add = function (style) {
	var self = this;
	return Promise.all([style.id(), style.sld(), style.definition(), style.name(), style.symbologyName(), style.changed(), style.changedBy(), style.created(), style.createdBy()]).then(function (results) {
		return self._pool.query(
			"insert into " + self._table + " (id, sld, definition, name, symbology_name, changed, changed_by, created, created_by ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
			results);
	}).catch(function(err){
		logger.error("PgStyles#add Error when saving in the database. Error: ", err);
	});
};

/**
 * @inheritDoc
 */
PgStyles.prototype.update = function(style) {
	var self = this;
	return Promise.all([style.id(), style.sld(), style.definition(), style.name(), style.symbologyName(), style.changed(), style.changedBy(), style.created(), style.createdBy()]).then(function (results) {
		return self._pool.query(
			"update " + self._table + " set sld=$2, definition=$3, name=$4, symbology_name=$5, changed=$6, changed_by=$7, created=$8, created_by=$9 where id = $1;",
			results);
	}).catch(function(err){
		logger.error("PgStyles#add Error when saving in the database. Error: ", err);
	});
};

/**
 * @inheritDoc
 */
PgStyles.prototype.all = function () {
	var self = this;
	return this._pool.query('select id from ' + self._table).then(function (ids) {
		ids = ids.rows.map(row => row.id);
		var styles = [];

		ids.forEach(function (id) {
			styles.push(new PgStyle(self._connectionPool, id, self._schema));
		});

		return styles;
	}).catch(function (err) {
		logger.error("PgStyles#all Error when querying the database. Error: ", err);
	});
};

module.exports = PgStyles;