let Promise = require('promise');
let logger = require('../common/Logger').applicationWideLogger;

var _ = require('underscore');

let FilteredBaseLayers = require('./FilteredBaseLayers');
let PgAnalyticalUnits = require('./PgAnalyticalUnits');

let GeometryConversion = require('../custom_features/GeometryConversion');

/**
 *
 */
class AnalyticalUnitsController {
	constructor(app, pgPool, mongoDb) {
		this._pool = pgPool;
		this._mongo = mongoDb;

		this._geometryConversion = new GeometryConversion({
			sourceCRSProjDef: 'EPSG:3857', // web Mercator
			targetCRSProjDef: 'EPSG:4326' // wgs84
		});

		app.get('/rest/au', this.read.bind(this));
	}

	/**
	 *
	 * @param request
	 * @param response
	 */
	read(request, response) {
		var self = this;
		var loc = JSON.parse(request.query.locations);
		let locations = loc && loc.length && loc.map(location => Number(location));
		new FilteredBaseLayers({
			location: {$in: locations},
			areaTemplate: request.query.areaTemplate && Number(request.query.areaTemplate),
			isData: false
		}, this._mongo)
			.read().then(baseLayers => {
			return Promise.all(baseLayers.map(baseLayer => {
				return new PgAnalyticalUnits(this._pool).all(baseLayer._id);
			}));
		}).then(results => {
			let all = [];
			let deduplicated = [];
			let converted = [];
			results.forEach(units => {
				if(units.length) {
					all = all.concat(units);
					deduplicated = _.uniq(all, 'gid');
				}
			});
			converted = self.convert(deduplicated);
			response.json({data: converted});
		}).catch(error => {
			logger.error('AnalyticalUnitsController#read Error: ', error);
			response.status(500).json({status: 'Err'});
		});
	}

	/**
	 * Convert geometries from one CRS to another
	 * @param units {Array} geometry has to be in st_astext
	 * @returns {Array} converted units
     */
	convert(units){
		let converted = [];
		units.map(unit => {
			unit["geom"] = this._geometryConversion.convertWKTGeometry(unit["st_astext"],false);
			converted.push(unit);
		});
		return converted;
	}
}

module.exports = AnalyticalUnitsController;