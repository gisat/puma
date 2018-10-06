let moment = require('moment');
let _ = require('underscore');

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
	 * 	layer what is the layer about.
	 * @param userId {Number} Id of the user who creates the layer.
	 */
    add(name, path, metadata, description, userId) {
		let time = moment().format('YYYY-MM-DD HH:mm:ss');

		return this.pgPool.query(`INSERT INTO ${this.schema}.${PgLayers.tableName()} (name, path, created, created_by, changed, changed_by) VALUES ('${name}', '${path}', '${time}', ${userId}, '${time}', ${userId}) RETURNING id`).then(result => {
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
    update(id, name, path, metadata, description) {
		if(!id || (userId !== 0 && !userId)) {
			throw new Error(`PgLayer#update Incorrect arguments Id: ${id}, UserId: ${userId}`);
		}

		let changes = [];
        if(metadata !== null) {
            changes.push(` metadata = '${metadata}' `);
        }

        if(description !== null) {
        	changes.push(` description = '${description} '`);
		}

		changes.push(` name = '${name} '`);
        changes.push(` path = '${path} '`);

		return this.pgPool.query(`
			UPDATE ${this.schema}.${PgLayers.tableName()} SET ${changes.join(',')} WHERE id = ${id}`).then(() => {
			return this.byId(id);
		});
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