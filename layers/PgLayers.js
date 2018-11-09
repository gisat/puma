let moment = require('moment');
let _ = require('underscore');
const _2 = require('lodash');

let logger = require('../common/Logger').applicationWideLogger;

let FilteredMongoLayerReferences = require('./FilteredMongoLayerReferences');

/**
 * It represents the layers stored in the PostgreSQL. This is main storage for the layers.
 */
class PgLayers {
    constructor(pgPool, mongo, schema) {
        this.pgPool = pgPool;
        this.schema = schema;
        this._mongo = mongo;
    }

	/**
	 * Return all layers stored in the PostgreSQL. Contains information about the usage of the layers.
	 */
	all() {
        // It returns names of all views representing layers in the PostgreSql.
        let dbLayers = null;
        return this.pgPool.query(`SELECT * FROM ${this.schema}.${PgLayers.tableName()}`).then(result => {
            // From the mongo retrieve whether they are referenced. They are referenced when the are used in a layerref.
            // Load LayerRefs with path in the layer path.
            dbLayers = result.rows;
            const paths = result.rows.map(layer => layer.path);
            return new FilteredMongoLayerReferences({layer: {$in: paths}}, this._mongo).json();
        }).then(layerReferences => {
            const usedPaths = layerReferences.map(layerReference => layerReference.layer);

            return dbLayers.map(layer => {
                return _.extend(layer, {
                    referenced: usedPaths.indexOf(layer.path) !== -1,
                    source: 'internal'
                })
            })
        });
    }

	/**
	 * If there is any it returns layer with given id. If there is none such layers, it throws Exception.
	 * @param id {Number} Id to look for in layers.
	 */
	byId(id) {
		return this.pgPool.query(`SELECT * FROM ${this.schema}.${PgLayers.tableName()} WHERE id = ${id}`).then(result => {
			if(result.rows.length === 0) {
				throw new Error(
					logger.error(`PgLayers#id No layer with given id: ${id}`)
				);
			}
			return result.rows[0];
		});
    }

	/**
	 * It adds new layer into the database and the returns newly create layer.
	 * @param name {String} Name of the layer
	 * @param path {String} Path represents the location to look for the layer. For geonode based layers it will be something akin to geonode:nameOfTheLayer, for analysis it will be something akin to analysis:an_35_as_24
	 * @param metadata {String} Metadata for the layer. Machine readable information about the layer.
	 * @param description {String} Description of what the layer represents. Explains to Users without knowledge of the
	 *    layer what is the layer about.
	 * @param userId {Number} Id of the user who creates the layer.
	 * @param source_url Path to where source data can be downloaded
	 */
    add(name, path, metadata, description, userId, source_url) {
		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		let columns = [];
		let values = [];

		if(name) {
			columns.push(`name`);
			values.push(name);
		}

		if(path) {
			columns.push(`path`);
			values.push(path);
		}

		if(metadata) {
			columns.push(`metadata`);
			values.push(metadata);
		}

		if(description) {
			columns.push(`description`);
			values.push(description);
		}

		if(source_url) {
			columns.push(`source_url`);
			values.push(source_url);
		}

		columns.push(`created`);
		values.push(time);

		columns.push(`created_by`);
		values.push(userId);

		columns.push(`changed`);
		values.push(time);

		columns.push(`changed_by`);
		values.push(userId);

		let indexes = _2.map(columns, (column, index) => {
			return `$${index+1}`;
		});

		return this.pgPool.query(
			`INSERT INTO ${this.schema}.${PgLayers.tableName()} (${columns.join(`, `)}) VALUES (${indexes.join(`, `)}) RETURNING id`,
			values
		).then(result => {
		    return this.byId(result.rows[0].id);
        });
    }

	/**
	 * It updates layer with given id. If no id or userId is specified throws Error. Id must be numeric otherwise the SQL update will fail.
	 * @param id {Number} Id of the layer
	 * @param name {String} Name of the layer
	 * @param path {String} Path to the layer as perceived by geonode.
     * @param metadata {String} Metadata for the layer. Machine readable information about the layer.
     * @param description {String} Description of what the layer represents. Explains to Users without knowledge of the
     * 	layer what is the layer about.
	 */
    update(id, name, path, metadata, description, userId, source_url) {
		if(!id || (userId !== 0 && !userId)) {
			throw new Error(`PgLayer#update Incorrect arguments Id: ${id}, UserId: ${userId}`);
		}

		let changes = [];
        if(metadata) {
            changes.push(` metadata = '${metadata}' `);
        } else if(metadata === null) {
			changes.push(` metadata = NULL `);
		}

        if(description) {
        	changes.push(` description = '${description}' `);
		} else if(description === null) {
			changes.push(` description = NULL `);
		}

		if(name) {
			changes.push(` name = '${name}' `);
		} else if(name === null) {
			changes.push(` name = NULL `);
		}

		if(path) {
			changes.push(` path = '${path}' `);
		} else if(path === null) {
			changes.push(` path = NULL `);
		}

		if(source_url) {
			changes.push(` source_url = '${source_url}' `);
		} else if(source_url === null) {
			changes.push(` source_url = NULL `);
		}

		if(changes.length) {
			return this.pgPool.query(`
			UPDATE ${this.schema}.${PgLayers.tableName()} SET ${changes.join(',')} WHERE id = ${id}`).then(() => {
				return this.byId(id);
			});
		} else {
			return Promise.reject(new Error('nothing to update'));
		}
	}

	/**
	 * It deletes layer with specified id from the persistent store. The layer remains in the source.
	 * @param id {Number} Unique identifier of the layer.
	 */
	delete(id) {
		return this.pgPool.query(`DELETE FROM ${this.schema}.${PgLayers.tableName()} WHERE id = ${id}`);
	}

	static tableName() {
		return 'layers';
	}
}

module.exports = PgLayers;