let moment = require('moment');
let Promise = require('promise');

let logger = require('../common/Logger').applicationWideLogger;

let FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');

/**
 * It represents the layers stored in the PostgreSQL. This is main storage for the layers.
 */
class PgLayers {
    constructor(pgPool, mongo, schema) {
        this.pgPool = pgPool;
        this._schema = schema;
        this._mongo = mongo;
    }

	/**
	 * It returns all layers stored in the postgresql.
	 */
	all() {
        // It returns names of all views representing layers in the PostgreSql.
        return this.pgPool.query(`SELECT * FROM ${this._schema}.layers`).then(result => {
        	// From the mongo retrieve whether they are referenced. They are referenced when the are used in a layerref.
			return Promise.all(result.rows.map(layer => {
				return new FilteredMongoLayerReferences({layer: layer.name}, this._mongo).json().then(layerReferences => {
					return {
						name: layer.name,
						path: layer.path,
						referenced: layerReferences.length > 0
					};
				});
			}));
        });
    }

	/**
	 * If there is any it returns layer with given id. If there is none such layers, it throws Exception.
	 * @param id {Number} Id to look for in layers.
	 */
	byId(id) {
		return this.pgPool.query(`SELECT * FROM ${this._schema}.layers WHERE id = ${id}`).then(result => {
			if(result.rows.length == 0) {
				throw new Error(
					logger.error(`PgLayers#id NO layer with given id: ${id}`)
				);
			}
			return result.rows[0];
		});
    }

	/**
	 * It adds new layer into the database and the returns newly create lyayer.
	 * @param name {String} Name of the layer
	 * @param path {String} Path represents the location to look for the layer. For geonode based layers it will be something akin to geonode:nameOfTheLayer, for analysis it will be something akin to analysis:an_35_as_24
	 * @param userId {Number} Id of the user who creates the layer.
	 */
    add(name, path, userId) {
		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		return this.pgPool.query(`INSERT INTO ${this._schema}.layers (name, path, created, created_by, changed, changed_by) VALUES ('${name}', '${path}', '${time}', ${userId}, '${time}', ${userId}) RETURNING id`).then(result => {
		    return this.byId(result.rows[0].id);
        });
    }
}

module.exports = PgLayers;