var superagent = require('superagent');
var config = require('../config');

var logger = require('../common/Logger').applicationWideLogger;
var Styles = require('./Styles');
var PgStyle = require('./PgStyle');

/**
 * Styles stored on the geoserver.
 * @alias GeoserverStyles
 * @augments Styles
 * @param pool {PgPool}
 * @param schema {String} Schema for the PgStyle.
 */
var GeoserverStyles = function (pool, schema) {
	Styles.call(this);

	this._pool = pool;
	this._schema = schema;
};

GeoserverStyles.prototype = Object.create(Styles.prototype);

GeoserverStyles.prototype.all = function(){
	var self = this;
	return superagent
		.get(config.geoserver2Host + ':' + config.geoserver2Port + config.geoserver2Path + '/rest/styles')
		.auth(config.geoserver2Username, config.geoserver2Password)
		.set('Accept','application/json; charset=utf-8')
		.then(function(result){
			if(!result.body || !result.body.styles || !result.body.styles.style){
				throw new Error(
					logger.error('GeoserverStyles#all Load all styles from the geoserver failed. No body was returned.')
				)
			}

			var styles = [];
			result.body.styles.style.forEach(style => {
				styles.push(new PgStyle(self._pool, style.name, self._schema));
			});

			return styles;
		});
};

/**
 * @inheritDoc
 */
GeoserverStyles.prototype.add = function (style) {
	var name;

	return style.uuid().then(function(uuid){
		name = uuid;
		return style.sld()
	}).then(function(sld){
		return superagent
			.post(config.geoserver2Host + ':' + config.geoserver2Port + config.geoserver2Path + '/rest/styles')
			.auth(config.geoserver2Username, config.geoserver2Password)
			.set('Accept','*/*')
			.set('Content-Type', 'application/vnd.ogc.sld+xml; charset=utf-8')
			.query({name: name})
			.send(sld)
	});
};

/**
 * @inheritDoc
 */
GeoserverStyles.prototype.update = function(style){
	var name;

	return style.uuid().then(function(uuid){
		name = uuid;
		return style.sld()
	}).then(function(sld){
		return superagent
			.put(config.geoserver2Host + ':' + config.geoserver2Port + config.geoserver2Path + '/rest/styles/' + name)
			.auth(config.geoserver2Username, config.geoserver2Password)
			.set('Accept','*/*')
			.set('Content-Type', 'application/vnd.ogc.sld+xml; charset=utf-8')
			.send(sld)
	});
};

module.exports = GeoserverStyles;