var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Promise = require('promise');
var Controller = require('./Controller');

var Statistics = require('../attributes/Statistics');
var PgAttribute = require('../attributes/PgAttribute');
var FilteredPgAttributes = require('../attributes/FilteredPgAttributes');

var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');


class AttributeController extends Controller {
	constructor(app, pgPool) {
		super(app, 'attribute', MongoAttributes, MongoAttribute);

		this._pgPool = pgPool;

		// podklad pro layerref - dataset, pole roku, attribute as attribute set and attribute, hodnota atributu
		// years: [2015,2015],
		// areaTemplate: 11
		// places: [1,5]
		// distribution: {type: 'normal', classes: 12}
		// attributes: [{attribute: 11, attributeSet: 12}, {}]

		// Vystup min, max a rozdeleni.
		// Mozne hodnoty v ramci textovych atributu
		// Min, max, distribution v numerickych atributu
		// {
		// attributes: [ {
		//   attribute: 11,
		//   attributeSet: 12,
		//   min: 1
		//   max: 5,
		//   type: 'numeric'
		//   distribution: []
		// }, {
		//   attribute: 11,
		//   attributeSet: 12,
		//   type: 'text',
		//   values: []
		// }, {
		//   attribute: 11,
		//   attributeSet: 12,
		//   type: 'boolean'
		// }  ]
		// }
		app.get('/rest/attribute/statistics', this.statistics.bind(this));

		// years: [2015,2015],
		// areaTemplate: 11
		// places: [1,5]
		// attributes: {attribute: 11, attributeSet: 2, value: '' || value: true || value: [min, max]}

		// Realny filter.
		// Pole objektu. Kazdy objekt predstavuje jednu analytickou jednotku. AreaTemplate pro objekt, Place, ke kteremu patri. Gid odpovidajici id v tabulce.
		// [{
		// loc: 2,
		// at: 15,
		// gid: 12
		// }]
		app.get('/rest/attribute/filter', this.filter.bind(this));
	}

	statistics(request, response, next) {
		var distribution = request.query.distribution;
		if(distribution.type == 'normal') {
			this.layerReferences(request).read().then(layerReferences => {
				return this.attributes(request, layerReferences);
			}).then(attributes => {
				return new Statistics(attributes).json();
			}).then(json => {
				response.json(json);
			})
		} else {
			throw new Error(
				logger.error(`AttributeController#statistics Wrong type of distribution.`)
			)
		}
	}

	filter(request, response, next) {
		this.layerReferences(request).read().then(layerReferences => {
			return this.attributes(request, layerReferences);
		}).then(attributes => {
			new FilteredPgAttributes(attributes).json();
		}).then(json => {
			response.json(json)
		});
	}

	attributes(request, layerReferences) {
		var attributes = [];

		// TODO: FIXME Hell based on the fact that we need the table which is in specific layerref for specific column.
		layerReferences.forEach(layerReference => {
			layerReference.columnMap.forEach(column => {
				request.query.attributes.forEach(attribute => {
					if (column.attribute == attribute.attribute && layerReference.attributeSet == attribute.attributeSet) {
						attributes.push({
							postgreSql: new PgAttribute(this._pgPool, 'views', `layer_${layerReference._id}`, `as_${attribute.attributeSet}_attr_${attribute.attribute}`),
							mongo: new MongoAttribute(attribute.attribute, conn.getMongoDb()),
							attributeSet: layerReference.attributeSet,
							location: layerReference.location,
							areaTemplate: request.query.areaTemplate,
							source: attribute
						});
					}
				});
			});
		});

		var mongoPromises = [];
		attributes.forEach(attribute => {
			mongoPromises.push(attribute.mongo.json());
		});

		return Promise.all(mongoPromises).then(mongoAttributes => {
			mongoAttributes.forEach((attribute, index) => {
				attributes[index].mongo = attribute;
			});

			return attributes;
		});
	}

	layerReferences(request) {
		var areaTemplate = Number(request.query.areaTemplate);
		var periods = request.query.periods.map(period => Number(period));
		var places = request.query.places.map(place => Number(place));
		var attributeSets = [];

		request.query.attributes.forEach(attribute => {
			if(attributeSets.indexOf(attribute.attributeSet) == -1) {
				attributeSets.push(attribute.attributeSet);
			}
		});

		attributeSets = attributeSets.map(attributeSet => Number(attributeSet));

		var filter = {
			year: {$in: periods},
			areaTemplate: areaTemplate,
			attributeSet: {$in: attributeSets}
		};

		if(places.length) {
			filter.location = {$in: places};
		}

		return new FilteredMongoLayerReferences(filter, conn.getMongoDb());
	}
}

module.exports = AttributeController;
