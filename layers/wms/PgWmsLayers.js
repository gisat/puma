let moment = require('moment');
let Promise = require('promise');
let _ = require('underscore');
let logger = require('../../common/Logger').applicationWideLogger;

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
		return this._pool.query(this.readSql()).then(result => {
			return this._transformRows(result.rows);
		});
	}

	/**
	 * It returns subset of the layers filtered by the
	 * @param scope {Number} Id of the scope on which are the layers filtered.
	 * @param place {Number} Id of the place on which are the layers filtered.
	 * @param periods {Number[]} Array of ids of periods relevant for the filtered layers.
	 */
	filtered(scope, place, periods) {
		let restrictions = [];
		if(scope) {
			restrictions.push(`scope = '${scope}'`)
		}

		if(place) {
			restrictions.push(`wms_layer_has_places.place_id = '${place}'`);
		}

		if(periods && periods.length) {
			restrictions.push(`wms_layer_has_periods.period_id in (${periods.join()})`)
		}

		let restrictionsSql = '';
		restrictions.map((restriction, index) => {
			if(index == 0) {
				restrictionsSql = ' WHERE ';
			} else {
				restrictionsSql += ' AND ';
			}

			restrictionsSql += restriction;
		});
		return this._pool.query(`${this.readSql()} ${restrictionsSql}`).then(result => {
			return this._transformRows(result.rows);
		});
	}

	/**
	 * It returns detail of the layer represent by id. If there is no such layer null is returned.
	 */
	byId(id) {
		return this._pool.query(`${this.readSql()} WHERE id = ${id}`).then(result => {
			return this._transformRows(result.rows);
		}).then(rows => {
			return rows[0];
		});
	}

	readSql() {
		return `SELECT * FROM ${this.schema}.${PgWmsLayers.tableName()} as layer LEFT JOIN ${this.schema}.wms_layer_has_places ON layer.id = wms_layer_has_places.wms_layer_id LEFT JOIN ${this.schema}.wms_layer_has_periods ON layer.id = wms_layer_has_periods.wms_layer_id`;
	}

	/**
	 * It transforms rows from database to internal objects.
	 * The SQL representation and loading vi joins means that there will be multiple rows with the same id with difference
	 * only in the periods and the places area.
	 * @private
	 */
	_transformRows(rows) {
		let layers = {};
		rows.forEach(layer => {
			if(!layers[layer.id]) {
				layers[layer.id] = layer;
				layer.periods = [];
				layer.places = [];
			}

			if(layer.period_id && layers[layer.id].periods.indexOf(layer.period_id) == -1) {
				layers[layer.id].periods.push(layer.period_id);
			}
			if(layer.place_id && layers[layer.id].places.indexOf(layer.place_id) == -1) {
				layers[layer.id].places.push(layer.place_id);
			}
		});
		let keys = Object.keys(layers);
		return keys.map(key => layers[key]);
	}

	/**
	 * It adds new WMS layer details to current store.
	 * @param layer {Object} WmsLayer to add.
	 * @param layer.name {String} Name of the layer
	 * @param layer.url {String} Url of the layer
     * @param layer.custom {String} Custom parameters
     * @param layer.scope {Number} Scope to which the layer belongs.
	 * @param layer.places {Number[]} Place to which the layer belongs.
	 * @param layer.periods {Number[]} Period to which the layer belongs.
	 * @param layer.layer {String} Name of the layer to use from given WMS Store.
	 * @param userId {Number} Id of the current user.
	 */
	add(layer, userId) {
		if (!userId && userId != 0) {
			throw new Error(`PgWmsLayer#add Incorrect arguments UserId: ${userId}`);
		}

		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		let scope = '';
		let scopeValue = '';
		if(layer.scope) {
			scope = 'scope, ';
			scopeValue = `${layer.scope}, `;
		}

		let id;

		// TODO: Enclose into transaction. Handle Rollback correctly.
		return this._pool.query(`
			INSERT INTO ${this.schema}.${PgWmsLayers.tableName()} (name, layer, url, ${scope} created, created_by, changed, changed_by, custom) VALUES ('${layer.name}','${layer.layer}','${layer.url}',${scopeValue} '${time}', ${userId}, '${time}', ${userId}, '${layer.custom}') RETURNING id;`).then(result => {
			id = result.rows[0].id;
			return this.insertDependencies(id, layer.places, layer.periods);
		}).then(() => {
			return this.byId(id);
		});
	}

	insertDependencies(id, places, periods) {
		let periodSql = '';
		if(periods && periods.length) {
			periods.forEach(period => {
				periodSql += `INSERT INTO ${this.schema}.wms_layer_has_periods (period_id, wms_layer_id) VALUES (${period}, ${id});`;
			});
		}

		let placeSql = '';
		if(places && places.length) {
			places.forEach(place => {
				placeSql += `INSERT INTO ${this.schema}.wms_layer_has_places (place_id, wms_layer_id) VALUES (${place}, ${id});`;
			});
		}

		return this._pool.query(`${periodSql} ${placeSql}`);
	}

	/**
	 * It updates already existing layer with new parameters. If the parameters are invalid or userId or id is missing error is thrown.
	 * @param layer {Object}
	 * @param layer.id {Number} Id of the layer to update
	 * @param layer.name {String} Name of the layer.
	 * @param layer.url {String} Url of the layer
	 * @param layer.custom {String} Custom parameters
     * @param layer.scope {Number} Scope to which the layer belongs.
	 * @param layer.places {Number[]} Place to which the layer belongs.
	 * @param layer.periods {Number[]} Period to which the layer belongs.
	 * @param layer.layer {String} Name of the layer used from given WMS.
	 * @param userId {Number} Id of the current user. If nobody is logged in, quest id will apply.
	 */
	update(layer, userId) {
		if (!layer.id || !userId && userId != 0) {
			throw new Error(`PgWmsLayer#update Incorrect arguments Id: ${layer.id}, UserId: ${userId}`);
		}

		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		let scopeSql = '';
		if(layer.scope) {
			scopeSql = `scope = ${layer.scope},`;
		}

		logger.info('PgWmsLayer#update Layer: ', layer, ' SQL: ', `UPDATE ${this.schema}.${PgWmsLayers.tableName()} SET name = '${layer.name}', url = '${layer.url}', layer='${layer.layer}', ${scopeSql} changed='${time}', changed_by=${userId} where id = ${layer.id}`);
		return this._pool.query(`UPDATE ${this.schema}.${PgWmsLayers.tableName()} SET name = '${layer.name}', url = '${layer.url}', layer='${layer.layer}', ${scopeSql} changed='${time}', changed_by=${userId}, custom='${layer.custom}' where id = ${layer.id}`).then(() => {
			return this._pool.query(this.deleteDependenciesSql(layer.id));
		}).then(() => {
			return this.insertDependencies(layer.id, layer.places, layer.periods);
		}).then(() => {
			return this.byId(layer.id);
		});
	}

	deleteDependenciesSql(id) {
		return `
			DELETE FROM ${this.schema}.wms_layer_has_places WHERE wms_layer_id = ${id};
			DELETE FROM ${this.schema}.wms_layer_has_periods WHERE wms_layer_id = ${id};
		`;
	}

	/**
	 * It removes details of the wms layer.
	 * @param id
	 */
	delete(id) {
		if (!id) {
			throw new Error(`PgWmsLayer#delete Incorrect arguments Id: ${id}`);
		}

		return this._pool.query(`
				${this.deleteDependenciesSql(id)}
				DELETE from ${this.schema}.${PgWmsLayers.tableName()} WHERE id = ${id};
		`);
	}

	static tableName() {
		return `wms_layers`;
	}
}

module.exports = PgWmsLayers;