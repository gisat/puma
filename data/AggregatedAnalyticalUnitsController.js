let logger = require('../common/Logger').applicationWideLogger;
let _ = require('underscore');
let Promise = require('promise');

let Attributes = require('../attributes/Attributes');
let Filter = require('../attributes/Filter');

class AggregatedAnalyticalUnitsController {
	constructor(app, pool, pgPoolRemote, viewsSchema) {
		this._pool = pool;

		this._filter = new Filter(pgPoolRemote || pool, viewsSchema);

		// Too much data. This is the reason for post, otherwise it should have been get.
		app.post('/rest/data/aggregated', this.getAsCsv.bind(this));
	}

	/**
	 *
	 * {
	 * 	 sets: [
	 * 	 	{
	 * 	 		name: 'Some name'
	 * 	 		categories: [
	 * 	 			{
	 * 	 				name: 'Category name',
	 * 	 				attributes: null
	 * 	 			},
	 * 	 			{
	 * 	 				name: 'Category name 2',
	 * 	 				attributes: null
	 * 	 			}
	 * 	 		]
	 * 	 	},
	 * 	 	{
	 * 	 		name: 'Some name 2'
	 * 	 		categories: [
	 * 	 			{
	 * 	 				name: 'Category name',
	 * 	 				attributes: null
	 * 	 			},
	 * 	 			{
	 * 	 				name: 'Category name 2',
	 * 	 				attributes: null
	 * 	 			}
	 * 	 		]
	 * 	 	}
	 * 	 ]
	 * }
	 *
	 * @param request
	 * @param response
	 */
	getAsCsv(request, response) {
		logger.info(`AggregatedAnalyticalUnitsController#getAsCsv AreaTemplate: ${request.body.areaTemplate} Periods: ${request.body.periods[0]} Places: ${request.body.places[0]} Sets: `, request.body.sets);

		let promises = [];
		let resultCsv = '';
		request.body.sets.forEach(set => {
			promises.push(
				Promise.all(set.categories.map(category => {
					var options = this._parseRequest({
						areaTemplate: request.body.areaTemplate,
						periods: request.body.periods,
						places: request.body.places,
						attributes: category.attributes
					});

					let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
					if (options.periods.length > 1) {
						return this._filter.statistics(attributes, options.attributesMap, options.attributes).then(json => {
							let result = this._deduplicate(_.flatten(json), json.length);
							return result.length;
						});
					} else {
						return this._filter.amount(attributes, options.attributes);
					}
				})).then(results => {
					logger.info(`AggregatedAnalyticalUnitsController#getAsCsv Results: `, results);
					resultCsv += `${set.name},${results.join(',')}\n`;
				})
			);
		});

		Promise.all(promises).then(() => {
			logger.info(`AggregatedAnalyticalUnitsController#getAsCsv CSV: ${resultCsv}`);
			response.set('Content-Type', 'text/csv');
			response.send(resultCsv);
		}).catch(err => {
			logger.error(`AggregatedAnalyticalUnitsController#getAsCsv Error: `, err);
			response.status(500).json({
				"status": "error",
				"error": err
			});
		})
	}

	_parseRequest(params) {
		let attributes;
		if (!params.isArray) {
			attributes = _.toArray(params.attributes);
		} else {
			attributes = params.attributes;
		}

		var attributesMap = {};
		attributes.forEach(
			attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
		);
		return {
			attributes: attributes,
			attributesMap: attributesMap,
			areaTemplate: Number(params.areaTemplate),
			periods: params.periods.map(period => Number(period)),
			places: params.places && params.places.map(place => Number(place)) || []
		};
	}

	/**
	 * Simply removes duplicates from the result.
	 * @param result {Array}
	 * @param amountOfDuplicated Amount of filter criteria.
	 * @returns {Array}
	 * @private
	 */
	_deduplicate(result, amountOfDuplicated) {
		let groupedInformation = _.groupBy(result, element => `${element.at}_${element.gid}_${element.loc}`);
		return Object.keys(groupedInformation).map(key => {
			return groupedInformation[key] &&
				groupedInformation[key].length == amountOfDuplicated &&
				groupedInformation[key].length &&
				groupedInformation[key][0] ||
				null;
		})
	}
}

module.exports = AggregatedAnalyticalUnitsController;