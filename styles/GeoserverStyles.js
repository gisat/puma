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
	this.schema = schema;
};

GeoserverStyles.prototype = Object.create(Styles.prototype);

GeoserverStyles.prototype.all = function(){
	var self = this;
	return superagent
		.get(config.geoserverHost + ':' + config.geoserverPort + config.geoserverPath + '/rest/styles')
		.auth(config.geoserverUsername, config.geoserverPassword)
		.set('Accept','application/json; charset=utf-8')
		.then(function(result){
			if(!result.body || !result.body.styles || !result.body.styles.style){
				throw new Error(
					logger.error('GeoserverStyles#all Load all styles from the geoserver failed. No body was returned.')
				)
			}

			var styles = [];
			result.body.styles.style.forEach(style => {
				styles.push(new PgStyle(self._pool, style.name, self.schema));
			});

			return styles;
		});
};

/**
 * @inheritDoc
 */
GeoserverStyles.prototype.add = function (style) {
	var name;

	return style.id().then(function(id){
		name = id;
		return style.sld()
	}).then(function(sld){
		logger.info(`GeoserverStyles#add Sld: ${sld}`);
		return superagent
			.post(config.geoserverHost + ':' + config.geoserverPort + config.geoserverPath + '/rest/styles')
			.auth(config.geoserverUsername, config.geoserverPassword)
			.set('Accept','application/json')
			.set('Content-Type', 'application/vnd.ogc.sld+xml')
			.query({name: name})
			.send(sld)
	});
};

/**
 * @inheritDoc
 */
GeoserverStyles.prototype.update = function(style){
	var name;

	return style.id().then(function(id){
		name = id;
		return style.sld()
	}).then(function(sld){
		return superagent
			.put(config.geoserverHost + ':' + config.geoserverPort + config.geoserverPath + '/rest/styles/' + name)
			.auth(config.geoserverUsername, config.geoserverPassword)
			.set('Accept','application/json')
			.set('Content-Type', 'application/vnd.ogc.sld+xml; charset=utf-8')
			.send(sld)
	});
};

module.exports = GeoserverStyles;