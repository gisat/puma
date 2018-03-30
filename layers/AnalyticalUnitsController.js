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
		this._analyticalUnits = new PgAnalyticalUnits(this._pool);

		app.get('/rest/au', this.read.bind(this));
		app.get('/rest/filtered/au', this.filtered.bind(this));
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
				return this._analyticalUnits.all(baseLayer._id);
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
	 * It returns filtered AU based on provided criteria, such as regex for name, geographical area. If none criteria is
	 * provided, the first 15 AU are provided to be consistent with the chart behaviors.
     * @param request {Object}
	 * @param request.query {Object}
	 * @param request.query.id {Number} Id of the analytical units. Basically the base layer ref referencing the au id.
	 * @param request.query.offset {Number} Optional. Starting point for retrieval of the data. Default is 0
	 * @param request.query.limit {Number} Optional. Amount of the units to retrieve. Default choice is 15
	 * @param request.query.filter {Text} Optional. Text to look for in the name of the analytical units.
	 *   To look in the column name.
     * @param response
     */
	filtered(request, response) {
		if(!request.query.id) {
			response.status(400).json({
				status: 'err',
				message: 'Id must be provided.'
			});
			return;
		}

		// TODO: Figure out access.

		this._analyticalUnits.filtered(Number(request.query.id), {
			offset: Number(request.query.offset || 0),
			limit: Number(request.query.limit || 15),
			filter: request.query.filter
		}).then(units => {
			response.json({
				data: units
			})
		}).catch(error => {
            logger.error('AnalyticalUnitsController#read Error: ', error);
            response.status(500).json({status: 'Err'});
		})
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