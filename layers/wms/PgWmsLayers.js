let moment = require('moment');
let _ = require('underscore');
let logger = require('../../common/Logger').applicationWideLogger;

let PgCollection = require('../../common/PgCollection');

/**
 * This class is responsible for handling the WMS related metadata.
 */
class PgWmsLayers extends PgCollection {
	/**
	 *
	 * @param pool
	 * @param mongo
	 * @param schema
	 */
	constructor(pool, mongo, schema) {
		super(pool, schema);
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
	 * @param places {Number[]} Array of ids of the places on which are the layers filtered.
	 * @param periods {Number[]} Array of ids of periods relevant for the filtered layers. If the periods are undefined,
	 *   the periods are ignored.
	 */
	filtered(scope, places, periods) {
		let restrictions = [];
		if(scope) {
			restrictions.push(`scope = '${scope}'`)
		}

		if(places && places.length > 0 && _.isArray(places) && !_.isEmpty(places.join())) {
			restrictions.push(`wms_layer_has_places.place_id in (${places.join()})`);
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
		let sql = `${this.readSql()} ${restrictionsSql}`;
		logger.info(`PgWmsLayer#filtered SQL: ${sql}`);
		return this._pool.query(sql).then(result => {
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
		return `SELECT * FROM ${this._schema}.${PgWmsLayers.tableName()} as layer LEFT JOIN ${this._schema}.wms_layer_has_places ON layer.id = wms_layer_has_places.wms_layer_id LEFT JOIN ${this._schema}.wms_layer_has_periods ON layer.id = wms_layer_has_periods.wms_layer_id`;
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
                layers[layer.id].getDates = layers[layer.id].get_date;
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
	 * @param layer.getDates {Boolean} True if this layer allows date line and time movements.
	 * @param userId {Number} Id of the current user.
	 */
	add(layer, userId) {
		if (!userId && userId != 0) {
			throw new Error(`PgWmsLayer#add Incorrect arguments UserId: ${userId}`);
		}

		let scope = '';
		let scopeValue = '';
		let getDates = '';
		let getDatesValues = '';
		if(layer.scope) {
			scope = 'scope, ';
			scopeValue = `${layer.scope}, `;
		}
		if(layer.getDates) {
			getDates = 'get_date, ';
			getDatesValues = `${layer.getDates}, `;
		}

		let id;

		let sql = `
			INSERT INTO ${this._schema}.${PgWmsLayers.tableName()} (name, layer, url, ${scope} ${getDates} custom) VALUES ('${layer.name}','${layer.layer}','${layer.url}',${scopeValue} ${getDatesValues} '${layer.custom}') RETURNING id;`;
		logger.info(`PgWmsLayers#add SQL: ${sql}`);
		return this._pool.query(sql).then(result => {
			id = result.rows[0].id;
			return this.insertDependencies(id, layer.places, layer.periods);
		}).then(() => {
			return this.byId(id);
		});
	}

	insertDependencies(id, places, periods) {
		return this._pool.query(this.insertDependenciesSql(id, places, periods));
	}

	insertDependenciesSql(id, places, periods) {
        let periodSql = '';
        if(periods && periods.length) {
            periods.forEach(period => {
                periodSql += `INSERT INTO ${this._schema}.wms_layer_has_periods (period_id, wms_layer_id) VALUES (${period}, ${id});`;
            });
        }

        let placeSql = '';
        if(places && places.length) {
            places.forEach(place => {
                placeSql += `INSERT INTO ${this._schema}.wms_layer_has_places (place_id, wms_layer_id) VALUES (${place}, ${id});`;
            });
        }

        return `${periodSql} ${placeSql}`;
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
     * @param layer.getDates {Boolean} True if this layer allows date line and time movements.
	 * @param userId {Number} Id of the current user. If nobody is logged in, quest id will apply.
	 */
	update(layer, userId) {
		if (!layer.id || !userId && userId != 0) {
			throw new Error(`PgWmsLayer#update Incorrect arguments Id: ${layer.id}, UserId: ${userId}`);
		}

		let sql = 'BEGIN TRANSACTION; ';
		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		let changes = [];
		if(layer.scope){
			changes.push(` scope = ${layer.scope} `);
		}
		if(layer.name) {
			changes.push(` name = '${layer.name}' `);
		}
		if(layer.url) {
			changes.push(` url = '${layer.url}' `);
		}
		if(layer.layer) {
			changes.push(` layer = '${layer.layer}' `);
		}
		if(layer.custom) {
			changes.push(` custom = '${layer.custom}' `);
		}
		if(layer.getDates) {
			changes.push(` get_date = ${layer.getDates}`)
		}

		changes.push(` changed = '${time}' `);
		changes.push(` changed_by = '${userId}' `);

		sql += `UPDATE ${this._schema}.${PgWmsLayers.tableName()} SET ${changes.join(',')} WHERE id = ${layer.id};`;

        sql += this.deleteDependenciesSql(layer.id);
		sql += this.insertDependenciesSql(layer.id, layer.places, layer.periods);

        sql += `COMMIT;`;

        logger.info('PgWmsLayer#update Layer: ', layer, ' SQL: ', sql);
		return this._pool.query(sql).then(() => {
			return this.byId(layer.id);
		}).catch(err => {
            logger.error(`PgPeriods#update ERROR: `, err);
            return this._pool.query(`ROLLBACK`);
        });
	}

	deleteDependenciesSql(id) {
		return `
			DELETE FROM ${this._schema}.wms_layer_has_places WHERE wms_layer_id = ${id};
			DELETE FROM ${this._schema}.wms_layer_has_periods WHERE wms_layer_id = ${id};
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
				DELETE from ${this._schema}.${PgWmsLayers.tableName()} WHERE id = ${id};
		`);
	}

	static tableName() {
		return `wms_layers`;
	}
}

module.exports = PgWmsLayers;