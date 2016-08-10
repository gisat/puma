var logger = require('../common/Logger').applicationWideLogger;

var Promise = require('promise');

var Audit = require('../data/Audit');

/**
 * Mongo representation of the Area Template entity.
 * @alias MongoAreaTemplate
 * @augments Audit
 */
class MongoAreaTemplate extends Audit {
	/**
	 *
	 * @param id {Number} Identifier of this template.
	 * @param database {Db}
	 */
	constructor (id, database){
		super();
		logger.info('MongoAreaTemplate#constructor Create mongo entity with id: ', id);

		this._id = id;
		this._database = database;
	}

	/**
	 * @private
	 */
	load() {
		var self = this;
		return this._database.collection(MongoAreaTemplate.collectionName()).find({_id: this._id}).toArray().then(function(allTemplates){
			if(!allTemplates || allTemplates.length == 0) {
				logger.error('MongoAreaTemplate#load There is no template with given id: ', self._id);
				allTemplates = [null];
			} else if(allTemplates.length > 1) {
				logger.warn('MongoAreaTemplate#load There are more templates with the same id: ', self._id);
			}
			return allTemplates[0];
		}).catch(function(error){
			logger.error('MongoAreaTemplate#constructor Loading the instance. Error: ', error);
		});
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

module.exports = MongoAreaTemplate;