var logger = require('../common/Logger').applicationWideLogger;

var Promise = require('promise');

var Audit = require('../data/Audit');
var MongoUniqueInstance = require('../data/MongoUniqueInstance');

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
		this._connection = database;
		this._mongoInstance = new MongoUniqueInstance(id, connection, MongoAreaTemplate.collectionName());
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