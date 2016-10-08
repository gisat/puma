var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Promise = require('promise');
var _ = require('underscore');
var Controller = require('./Controller');

var Statistics = require('../attributes/Statistics');
var PgAttribute = require('../attributes/PgAttribute');
var FilteredPgAttributes = require('../attributes/FilteredPgAttributes');

var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');
var JsonMongoAttribute = require('../attributes/JsonMongoAttribute');
var BaseLayerReference = require('../layers/BaseLayerReference');

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
		app.get('/rest/filter/attribute/statistics', this.statistics.bind(this));

		// periods: [2015,2015],
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
		app.get('/rest/filter/attribute/filter', this.filter.bind(this));
	}

	statistics(request, response, next) {
		var distribution = request.query.distribution;
		if(distribution.type == 'normal') {
			this.attributes(request).then(attributes => {
				return new Statistics(_.flatten(attributes), Number(distribution.classes)).json();
			}).then(json => {
				response.json(json);
			}).catch(err => {
				throw new Error(
					logger.error(`AttributeController#statistics Error: `, err)
				)
			})
		} else {
			throw new Error(
				logger.error(`AttributeController#statistics Wrong type of distribution.`)
			)
		}
	}

	filter(request, response, next) {
		this.attributes(request).then(attributes => {
			return new FilteredPgAttributes(_.flatten(attributes)).json();
		}).then(json => {
			response.json(json)
		}).catch(err => {
			throw new Error(
				logger.error(`AttributeController#filter Error: `, err)
			)
		});
	}

	// TODO: Add reference to the base layer to the layer references.
	attribute(request, attribute) {
		var areaTemplate = Number(request.query.areaTemplate);
		var periods = request.query.periods.map(period => Number(period));
		var places = request.query.places.map(place => Number(place));
		var baseLayerReferences;
		var jsonMongoAttribute = new JsonMongoAttribute(new MongoAttribute(attribute.attribute, conn.getMongoDb()), conn.getMongoDb());

		return jsonMongoAttribute.layerReferences().then(layerReferences => {
			return layerReferences.filter(layerReference => {
				let isAreaTemplateEqual = layerReference.areaTemplate == areaTemplate;
				let isPeriodContained = periods.indexOf(layerReference.year) != -1;
				let isPlaceContained = !places.length || places.indexOf(layerReference.location) != -1;

				return isAreaTemplateEqual && isPeriodContained && isPlaceContained;
			});
		}).then(layerReferences => {
			// I have list of relevant layer references. Now I need to get the base layer refs.
			var baseReferences = [];

			layerReferences.forEach(layerReference => {
				baseReferences.push(
					new BaseLayerReference(layerReference, conn.getMongoDb()).layerReferences()
				);
			});

			return Promise.all(baseReferences)
		}).then(layerReferences => {
			layerReferences = _.flatten(layerReferences);
			// Filter so that there aren't duplicates.
			let baseReferencesIds = [];
			baseLayerReferences = layerReferences.filter(layerReference => {
				if (baseReferencesIds.indexOf(layerReference._id) == -1) {
					baseReferencesIds.push(layerReference._id);
					return true;
				} else {
					return false;
				}
			});

			return jsonMongoAttribute.json();
		}).then(jsonAttribute =>{
			return baseLayerReferences.map(layerReference => {
				return {
					postgreSql: new PgAttribute(this._pgPool, 'views', `layer_${layerReference._id}`, `as_${attribute.attributeSet}_attr_${attribute.attribute}`),
					mongo: jsonAttribute,
					attributeSet: attribute.attributeSet,
					location: layerReference.location,
					areaTemplate: layerReference.areaTemplate,
					source: attribute
				}
			})
		});
	}

	attributes(request) {
		var promises = [];
		request.query.attributes.forEach(attribute => {
			attribute.attribute = Number(attribute.attribute);
			attribute.attributeSet = Number(attribute.attributeSet);

			promises.push(this.attribute(request, attribute));
		});
		return Promise.all(promises);
	}
}

module.exports = AttributeController;
