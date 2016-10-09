var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Promise = require('promise');
var _ = require('underscore');
var Controller = require('./Controller');

var Statistics = require('../attributes/Statistics');
var PgAttribute = require('../attributes/PgAttribute');
var PgCompoundAttribute = require('../attributes/PgCompoundAttribute');
var FilteredPgAttributes = require('../attributes/FilteredPgAttributes');

var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');
var JsonMongoAttribute = require('../attributes/JsonMongoAttribute');
var BaseLayerReference = require('../layers/BaseLayerReference');

class AttributeController extends Controller {
	constructor(app, pgPool) {
		super(app, 'attribute', MongoAttributes, MongoAttribute);

		this._pgPool = pgPool;

		app.get('/rest/filter/attribute/statistics', this.statistics.bind(this));
		app.get('/rest/filter/attribute/filter', this.filter.bind(this));
	}

	statistics(request, response, next) {
		var distribution = request.query.distribution;
		if(distribution.type == 'normal') {
			this.attributes(request, true).then(attributes => {
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
		this.attributes(request, false).then(attributes => {
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
				let isAttributeSetEqual = attribute.attributeSet == layerReference.attributeSet;

				return isAreaTemplateEqual && isPeriodContained && isPlaceContained && isAttributeSetEqual;
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

	attributes(request, forStatistics) {
		var promises = [];
		var resolvedAttributes = [];

		request.query.attributes.forEach(attribute => {
			attribute.attribute = Number(attribute.attribute);
			attribute.attributeSet = Number(attribute.attributeSet);

			promises.push(this.attribute(request, attribute).then(attributes => {
				if(forStatistics) {
					if(attributes.length > 1) {
						let pgAttributes = [];
						attributes.forEach(attribute => {
							pgAttributes.push(attribute.postgreSql);
						});
						attributes[0].postgreSql = new PgCompoundAttribute(pgAttributes, attributes[0].mongo.type);
						resolvedAttributes.push(attributes[0]);
						return attributes[0];
					} else {
						resolvedAttributes.push(attributes);
						return attributes;
					}
				} else {
					resolvedAttributes.push(attributes);
					return attributes;
				}
			}));
		});
		return Promise.all(promises).then(() => {
			return resolvedAttributes;
		});
	}
}

module.exports = AttributeController;
