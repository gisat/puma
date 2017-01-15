let moment = require('moment');
let Promise = require('promise');

let FilteredMongoLayerReferences = require('../FilteredMongoLayerReferences');

/**
 * This class is responsible for handling the WMS related metadata.
 */
class PgWmsLayers {
	constructor(pool, schema) {
		this._pool = pool;
		this._schema = schema;
	}

	/**
	 * It returns all stored WMS layer with their details.
	 */
	all() {
		return this._pool.query(`SELECT * FROM ${this._schema}.wms_layer`).then(result => {
			return this._transformRows(result.rows);
		});
	}

	/**
	 * It returns detail of the layer represent by id. If there is no such layer null is returned.
	 */
	byId(id) {
		return this._pool.query(`SELECT * from ${this._schema}.wms_layer WHERE id = ${id}`).then(result => {
			return this._transformRows(result.rows)[0];
		});
	}

	/**
	 * It transforms rows from database to internal objects.
	 * @private
	 */
	_transformRows(rows) {
		return Promise.all(rows.map(layer => {
			return new FilteredMongoLayerReferences({layer: layer.name}, this._mongo).json().then(layerReferences => {
				return {
					name: layer.name,
					path: layer.path,
					referenced: layerReferences.length > 0,
					source: 'internal'
				};
			});
		}));
	}

	/**
	 * It adds new WMS layer details to current store.
	 * @param name {String} Name of the layer to handle.
	 * @param url {String} Url of the WMS store.
	 * @param userId {Number} Id of current user.
	 */
	add(name, url, userId) {
		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		return this._pool.query(`INSERT INTO ${this._schema}.wms_layer (name, url, created, created_by, changed, changed_by) VALUES ('${name}','${url}','${time}', ${userId}, '${time}', ${userId}) RETURNING id`).then(result => {
			return this.byId(result.rows[0].id);
		});
	}

	/**
	 * It removes details of the wms layer.
	 * @param id
	 */
	delete(id) {
		return this._pool.query(`DELETE from ${this._schema}.wms_layer WHERE id = ${id}`);
	}
}

module.exports = PgWmsLayers;