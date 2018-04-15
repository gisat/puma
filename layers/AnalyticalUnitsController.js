let Promise = require('promise');
let logger = require('../common/Logger').applicationWideLogger;

var _ = require('underscore');

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
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
        app.get('/rest/au/:id', this.byId.bind(this));

        app.get('/rest/filtered/au', this.filtered.bind(this));

        app.get('/rest/scope/:id/au/:parent', this.readByScope.bind(this));
	}

    /**
	 * It returns detailed information about the specific unit from given analytical units table.
     * @param request
	 * @param request.query.id {Number} Id of the table containing analytical unit.
	 * @param request.params.id {Number} Id of the specific analytical unit.
     * @param response
     */
	byId(request, response) {
		let analyticalUnitsId = request.query.id;
		let id = request.params.id;

		this._analyticalUnits.byId(analyticalUnitsId, id).then(analyticalUnit => {
			response.json({
				data: analyticalUnit
			})
		}).catch(err => {
			logger.error('AnalyticalUnitsController#byId Error: ', err);

			response.status(500).json({
				status: 'err',
				message: err
			})
		})
	}

    /**
	 * It returns analytical units relevant to given scope. It supports reading of top level AUs as well as the next level
	 * of descendants.
     * @param request
	 * @param request.params.id {Number} Id of the scope
	 * @param request.params.parent {Number} Optional. Id of the analytical units parent.
	 * @param request.query.limit {Number} Optional. Amount of unit s to retrieve in the request. If nothing is provided,
	 * 	all are retrieved
	 * @param request.query.offset {Number} Optional. What AU should the results start. Important for the rolling retrieval.
     * @param response
     */
    readByScope(request, response) {
        if(!request.params.id) {
            response.status(400).json({
                "status": "err",
                "message": "The scope id must be provided."
            });
            return;
        }

        // Optional.
        let limit = request.query.limit;
        let offset = request.query.offset;

        // Paramters in the text.
        let scopeId = request.params.id;
        let parentId = request.params.parent; // Parent ID is optional. If there is none, bring top level for the scope.

		if(!parentId) {
            let locations, scope;
            new FilteredMongoLocations({dataset: scopeId}).json().then(pLocations => {
                locations = pLocations;
                return new FilteredMongoScopes({_id: scopeId}).json();
            }).then(scopes => {
                scope = scopes[0];
                return this.getAUForLocations(locations.map(location => location._id), scope.featureLayers[0], limit, offset);
            }).then(analyticalUnits => {
                response.json({data: analyticalUnits});
            }).catch(error => {
                logger.error('AnalyticalUnitsController#readByScope Error: ', error);
                response.status(500).json({status: 'Err'});
            });
        } else {
			// Find a table containing all the data for given level.
			// If the view doesn't exists or changed. Create view containing all the units for given level. This
			// is actually usable for the top level as well.
		}
    }


    /**
	 * It returns only general information about the analytical units. If you need more detailed
	 * @param request
	 * @param response
	 */
    read(request, response) {
        var loc = JSON.parse(request.query.locations);
        let locations = loc && loc.length && loc.map(location => Number(location));
        this.getAUForLocations(locations, request.query.areaTemplate && Number(request.query.areaTemplate)).then(data => {
            response.json({data: data});
        }).catch(error => {
            logger.error('AnalyticalUnitsController#read Error: ', error);
            response.status(500).json({status: 'Err'});
        })
    }

    getAUForLocations(locations, areaTemplate, limit, offset) {
    	return new FilteredBaseLayers({
            location: {$in: locations},
            areaTemplate: areaTemplate,
            isData: false
        }, this._mongo)
            .read().then(baseLayers => {
                return Promise.all(baseLayers.map(baseLayer => {
                    return this._analyticalUnits.filtered(baseLayer._id, {
                    	limit: limit,
						offset: offset
					}); // Use the filtered version instead.
                }));
            }).then(results => {
                let all = [];
                results.forEach(units => {
                    if(units.length) {
                        all = all.concat(units);
                    }
                });
                return self.deduplicate(all);
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
					if ((unit.gid === dedup.gid) && (unit.name === dedup.name)){
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