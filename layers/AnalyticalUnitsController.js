let Promise = require('promise');
let logger = require('../common/Logger').applicationWideLogger;

var _ = require('underscore');

let FilteredBaseLayers = require('./FilteredBaseLayers');
let PgAnalyticalUnits = require('./PgAnalyticalUnits');

/**
 *
 */
class AnalyticalUnitsController {
	constructor(app, pgPool, mongoDb) {
		this._pool = pgPool;
		this._mongo = mongoDb;

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
			let deduplicated;
			results.forEach(units => {
				if(units.length) {
					all = all.concat(units);
				}
			});
			deduplicated = self.deduplicate(all);
			response.json({data: deduplicated});
		}).catch(error => {
			logger.error('AnalyticalUnitsController#read Error: ', error);
			response.status(500).json({status: 'Err'});
		});
	}

	/**
	 * Remove duplicates
	 * @param units {Array}
	 * @returns {Array}
     */
	deduplicate(units){
		let deduplicated = [];
		units.map(unit => {
			if (deduplicated.length > 0){
				let duplicate = false;
				deduplicated.map(dedup => {
					if ((unit.gid == dedup.gid) && (unit.name == dedup.name)){
						duplicate = true;
					}
				});
				if (!duplicate){
					deduplicated.push(unit);
				}

			} else {
				deduplicated.push(unit);
			}
		});
		return deduplicated;
	}
}

module.exports = AnalyticalUnitsController;