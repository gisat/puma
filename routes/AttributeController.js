var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Promise = require('promise');
var Controller = require('./Controller');

var Statistics = require('../attributes/Statistics');
var PgAttribute = require('../attributes/PgAttribute');

var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');


class AttributeController extends Controller {
	constructor(app, pgPool) {
		super(app, 'attribute', MongoAttributes, MongoAttribute);

		this._pgPool = pgPool;

		// podklad pro layerref - dataset, pole roku, attribute as attribute set and attribute, hodnota atributu
		// dataset: 5,
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

		// dataset: 5,
		// years: [2015,2015],
		// areaTemplate: 11
		// places: [1,5]
		// attributes: {attribute: 11, attributeSet: 2, value: '' || value: true || value: [min, max]}

		// Realny filter.
		// Pole objektu. Kazdy objekt predstavuje jednu analytickou jednotku. AreaTemplate pro objekt, Place, ke kteremu patri. Gid odpovidajici id v tabulce.
		// [{
		// loc: 2,
		// at: 15
		// gid: 12
		// }]
		app.get('/rest/attribute/filter', this.filter.bind(this));
	}

	statistics(request, response, next) {
		var areaTemplate = request.query.areaTemplate;
		var periods = request.query.years;
		var places = request.query.places;
		var attributeSets = [];

		request.query.attributes.forEach(attribute => {
			if(attributeSets.indexOf(attribute.attributeSet) == -1) {
				attributeSets.push(attribute.attributeSet);
			}
		});

		var filteredLayerReferences = new FilteredMongoLayerReferences({
			location: {$in: places},
			year: {$in: periods},
			areaTemplate: areaTemplate,
			attributeSet: {$in: attributeSets},
		}, conn.getMongoDb());

		var distribution = request.query.distribution;
		if(distribution.type == 'normal') {
			let attributes = [];
			return filteredLayerReferences.read().then(layerReferences => {
				// TODO: FIXME Hell based on the fact that we need the table which is in specific layerref for specific column.
				layerReferences.forEach(layerReference => {
					layerReference.columnMap.forEach(column => {
						request.query.attributes.forEach(attribute => {
							if (column.attribute == attribute.attribute && layerReference.attributeSet == attribute.attributeSet) {
								attributes.push({
									postgreSql: new PgAttribute(this._pgPool, 'views', `layer_${layerReference._id}`, `as_${attribute.attributeSet}_attr_${attribute.attribute}`),
									mongo: new MongoAttribute(attribute.attribute, conn.getMongoDb()),
									attributeSet: layerReference.attributeSet
								});
							}
						});
					});
				});

				// Replace all mongo attributes with json version.
				var mongoPromises = [];
				attributes.forEach(attribute => {
					mongoPromises.push(attribute.mongo.json());
				});
				return Promise.all(mongoPromises);
			}).then(mongoAttributes => {
				mongoAttributes.forEach((attribute, index) => {
					attributes[index].mongo = attribute;
				});

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

	}

	read(request, response, next) {
		logger.info('AttributeController#read Read filtered attributes.');

		var self = this;

		var params = {
			attr: request.params.id,
			attrSet: request.query.attrSet,
		};

		var filter = {_id: parseInt(request.params.id)};

		crud.read(this.type, filter, {
			userId: request.userId,
			justMine: request.query['justMine']
		}, function (err, result) {
			if (err) {
				logger.error("It wasn't possible to read item: ", request.params.objId, " from collection:", self.type, " by User:", request.userId, " Error: ", err);
				return next(err);
			}

			result[0].attrSet = Number(params.attrSet);
			response.data = result;
			next();

		});
	};
}

module.exports = AttributeController;