var logger = require('../common/Logger').applicationWideLogger;

var Promise = require('promise');

var Audit = require('../data/Audit');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');
var FilteredMongoAnalysis = require('../analysis/FilteredMongoAnalysis');
var FilteredMongoPerformedAnalysis = require('../analysis/FilteredMongoPerformedAnalysis');
var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
var FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
var FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');
var FilteredMongoChartConfigurations = require('../visualization/FilteredMongoChartConfigurations');

// Probably contains the Chart configuration as well.
// areas
// selectedAreas

/**
 * Mongo representation of the Area Template entity.
 * @alias MongoLayerTemplate
 * @augments Audit
 */
class MongoLayerTemplate extends Audit {
	/**
	 *
	 * @param id {Number} Identifier of this template.
	 * @param connection {Db}
	 */
	constructor (id, connection){
		super();
		logger.info('MongoLayerTemplate#constructor Create mongo entity with id: ', id);

		this._id = id;
		this._connection = connection;
		this._mongoInstance = new MongoUniqueInstance(id, connection, MongoLayerTemplate.collectionName());
		this._analysis = new FilteredMongoAnalysis({areaTemplate: id}, connection);
		this._attributeSets = new FilteredMongoAttributeSets({featureLayers: {$in: [id]}}, connection);
		this._scopes = new FilteredMongoScopes({featureLayers: {$in: [id]}}, connection);
		this._layerReferences = new FilteredMongoLayerReferences({areaTemplate: id}, connection);
		this._performedAnalysis = new FilteredMongoPerformedAnalysis({featureLayerTemplates: {$id: [id]}}, connection);
		this._chartConfigurations = new FilteredMongoChartConfigurations({}, connection);
	}

	/**
	 * @private
	 */
	load() {
		return this._mongoInstance.read();
	}

	/**
	 * @inheritDoc
	 * @returns {Promise.<Number>}
	 */
	id() {
		return Promise.resolve(this._id);
	}

	/**
	 * It represents the name of the Area template
	 * @returns {Promise|*|Request|Promise.<String>}
	 */
	name() {
		return this.load().then(function(wholeEntity){
			return wholeEntity.name;
		});
	}

	/**
	 * It represents the type of the layer. So far we supports au, vector and raster.
	 * @returns {Promise|*|Request|Promise.<String>}
	 */
	layerType() {
		return this.load().then(function(wholeEntity){
			return wholeEntity.layerType;
		});
	}

	styles() {
		return this.load().then(function(wholeEntity){
			return wholeEntity.symbologies; // Older name for styles. It is used throughout the databases.
		});
	}

	/**
	 * @inheritDoc
	 */
	created() {
		return this.load().then(function(wholeEntity){
			return wholeEntity.created;
		});
	}

	/**
	 * @inheritDoc
	 */
	createdBy() {
		return this.load().then(function(wholeEntity){
			return wholeEntity.createdBy;
		});
	}

	/**
	 * @inheritDoc
	 */
	changed() {
		return this.load().then(function(wholeEntity){
			return wholeEntity.changed;
		});
	}

	/**
	 * @inheritDoc
	 */
	changedBy() {
		return this.load().then(function(wholeEntity){
			return wholeEntity.changedBy;
		});
	}

	analysis() {
		return this._analysis.read();
	}

	attributeSets() {
		return this._attributeSets.read();
	}

	scopes() {
		return this._scopes.read();
	}

	layerReferences() {
		return this._layerReferences.read();
	}

	performedAnalysis() {
		return this._performedAnalysis.read();
	}

	chartConfigurations() {
		// TODO: Find out the link between chart configuration and the layer template.
		return [];
	}

	/**
	 * It returns json representation of this entity.
	 * @returns {Promise.<Object>}
	 */
	json() {
		return this.load();
	}

	static example() {
		return {
			_id: 1,
			name: 'GADM0',
			layerType: 'au',
			active: false,
			created: new Date("2016-07-24T00:09:54.462Z"),
			createdBy: 1,
			changed: new Date("2016-07-24T00:09:54.462Z"),
			changedBy: 1,
			symbologies: [],
			layerGroup: null,
			topic: null
		}
	}

	static collectionName() {
		return 'areatemplate';
	}
}

module.exports = MongoLayerTemplate;