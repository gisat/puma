var Styles = require('./Styles');
var PgStyle = require('./PgStyle');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

/**
 * @alias PgStyles
 * @augments Styles
 * @param connectionPool {PgPool} Pool of the connections.
 * @constructor
 */
var PgStyles = function (connectionPool, schema) {
	Styles.call(this);

	this._connectionPool = connectionPool;
	this._pool = connectionPool.pool();
	this._schema = schema;
	this._table = this._schema + ".style";
};

PgStyles.prototype = Object.create(Styles.prototype);

/**
 * @inheritDoc
 * @param style {Style} Style to add into the PostgreSQL.
 */
PgStyles.prototype.add = function (style) {
	var self = this;
	return Promise.all([style.uuid(), style.sld(), style.definition(), style.name(), style.symbologyName(), style.changed(), style.changedBy(), style.created(), style.createdBy()]).then(function (results) {
		return self._pool.query(
			"insert into " + self._table + " (uuid, sld, definition, name, symbology_name, changed, changed_by, created, created_by ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
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
	return this._pool.query('select uuid from ' + self._table).then(function (uuids) {
		uuids = uuids.rows.map(row => row.uuid);
		var styles = [];

		uuids.forEach(function (uuid) {
			styles.push(new PgStyle(self._connectionPool, uuid, self._schema));
		});

		return styles;
	}).catch(function (err) {
		logger.error("PgStyles#all Error when querying the database. Error: ", err);
	});
};

module.exports = PgStyles;