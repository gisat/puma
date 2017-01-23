let moment = require('moment');
let Promise = require('promise');
let _ = require('underscore');

let FilteredMongoLayerReferences = require('../FilteredMongoLayerReferences');

/**
 * This class is responsible for handling the WMS related metadata.
 */
class PgWmsLayers {
	/**
	 *
	 * @param pool
	 * @param mongo
	 * @param schema
	 */
	constructor(pool, mongo, schema) {
		this._pool = pool;
		this._mongo = mongo;
		this.schema = schema;
	}

	/**
	 * It returns all stored WMS layer with their details.
	 */
	all() {
		return this._pool.query(`SELECT * FROM ${this.schema}.${PgWmsLayers.tableName()}`).then(result => {
			return this._transformRows(result.rows);
		});
	}

	/**
	 * It returns detail of the layer represent by id. If there is no such layer null is returned.
	 */
	byId(id) {
		return this._pool.query(`SELECT * from ${this.schema}.${PgWmsLayers.tableName()} WHERE id = ${id}`).then(result => {
			return this._transformRows(result.rows);
		}).then(rows => {
			return rows[0];
		});
	}

	/**
	 * It transforms rows from database to internal objects.
	 * @private
	 */
	_transformRows(rows) {
		return Promise.all(rows.map(layer => {
			return new FilteredMongoLayerReferences({layer: layer.name}, this._mongo).json().then(layerReferences => {
				return _.extend(layer, {
					referenced: layerReferences.length > 0,
					source: 'internal'
				});
			});
		}));
	}

	/**
	 * It adds new WMS layer details to current store.
	 * @param layer {Object} WmsLayer to add.
	 * @param layer.name {String} Name of the layer
	 * @param layer.url {String} Url of the layer
	 * @param layer.scope {Number} Scope to which the layer belongs.
	 * @param layer.place {Number} Place to which the layer belongs.
	 * @param layer.period {Number} Period to which the layer belongs.
	 * @param userId {Number} Id of the current user.
	 */
	add(layer, userId) {
		if (!userId && userId != 0) {
			throw new Error(`PgWmsLayer#add Incorrect arguments UserId: ${userId}`);
		}

		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		return this._pool.query(`INSERT INTO ${this.schema}.${PgWmsLayers.tableName()} (name, url, scope, place, period, created, created_by, changed, changed_by) VALUES ('${layer.name}','${layer.url}',${layer.scope}, ${layer.place}, ${layer.period}, '${time}', ${userId}, '${time}', ${userId}) RETURNING id`).then(result => {
			return this.byId(result.rows[0].id);
		});
	}

	/**
	 * It updates already existing layer with new parameters. If the parameters are invalid or userId or id is missing error is thrown.
	 * @param layer {Object}
	 * @param layer.id {Number} Id of the layer to update
	 * @param layer.name {String} Name of the layer.
	 * @param layer.url {String} Url of the layer
	 * @param layer.scope {Number} Scope to which the layer belongs.
	 * @param layer.place {Number} Place to which the layer belongs.
	 * @param layer.period {Number} Period to which the layer belongs.
	 * @param userId {Number} Id of the current user. If nobody is logged in, quest id will apply.
	 */
	update(layer, userId) {
		if (!layer.id || !userId && userId != 0) {
			throw new Error(`PgWmsLayer#update Incorrect arguments Id: ${layer.id}, UserId: ${userId}`);
		}

		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		return this._pool.query(`UPDATE ${this.schema}.${PgWmsLayers.tableName()} SET name = '${layer.name}', url = '${layer.url}', scope=${layer.scope}, place=${layer.place}, period=${layer.period}, changed='${time}', changed_by=${userId} where id = ${layer.id}`).then(() => {
			return this.byId(layer.id);
		})
	}

	/**
	 * It removes details of the wms layer.
	 * @param id
	 */
	delete(id) {
		if (!id) {
			throw new Error(`PgWmsLayer#delete Incorrect arguments Id: ${id}`);
		}

		return this._pool.query(`DELETE from ${this.schema}.${PgWmsLayers.tableName()} WHERE id = ${id}`);
	}

	static tableName() {
		return `wms_layers`;
	}
}

module.exports = PgWmsLayers;