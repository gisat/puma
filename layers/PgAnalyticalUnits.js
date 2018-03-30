let logger = require('../common/Logger').applicationWideLogger;

/**
 * It simply retrieves all the analytical units associated with given base layer references.
 */
class PgAnalyticalUnits {
	constructor(pool) {
		this._pool = pool;
	}

	all(analyticalUnitId) {
		return this.getSrid(analyticalUnitId).then(srid => {
			let sql = this.getSql(srid, analyticalUnitId, '');

            return this._pool.query(sql).then(result => {
                return result.rows;
            });
		});
	}

    /**
	 *
	 * @private
     * @param srid {Number} Id of the used coordinate system
     * @param analyticalUnitId {Number} Id of the analytical unit to use.
     * @param filter {String} Filering string to be appended to the end of the filter.
     * @returns {String} Sql for getting the relevant units
     */
	getSql(srid, analyticalUnitId, filter) {
		filter = filter || '';
        if (srid === 4326){
            return `SELECT gid, name, ST_AsText(the_geom) as geom, ST_AsText(ST_centroid(the_geom)) as centroid FROM views.layer_${analyticalUnitId} ${filter};`;
        } else {
            return `SELECT gid, name, ST_AsText(St_Transform(the_geom, 4326)) as geom, ST_AsText(ST_centroid(St_Transform(the_geom, 4326))) as centroid FROM views.layer_${analyticalUnitId} ${filter};`;
        }
	}

    /**
	 *
	 * @private
     * @param analyticalUnitId {Number} Id of the analytical units to use.
     * @returns {Number} Id of used coordinate system.
     */
	getSrid(analyticalUnitId) {
        return this._pool.query(`SELECT Find_SRID('views', 'layer_${analyticalUnitId}', 'the_geom');`).then(result => {
            return result.rows[0]["find_srid"];
        });
	}

    /**
	 * It returns filtered analytical units. The units are stably ordere by their gid.
     * @param analyticalUnitId {Number} Id of the table of the analytical units. It reflects base layerref id.
     * @param filter {Object}
	 * @param filter.offset {Number} The number of the analytical unit, which we should start with.
	 * @param filter.limit {Number} The maximum amount of analytical units to retrieve.
	 * @param filter.filter {String} Optional.
     * @returns {*}
     */
	filtered(analyticalUnitId, filter) {
        if(typeof analyticalUnitId === 'undefined') {
            throw new Error(logger.error(`PgAnalyticalUnits#filtered Id of the analytical unit isn't present`));
        }
        if(typeof filter.offset === 'undefined') {
			throw new Error(logger.error(`PgAnalyticalUnits#filtered Offset isn't present`));
		}
		if(typeof filter.limit === 'undefined') {
            throw new Error(logger.error(`PgAnalyticalUnits#filtered Limit isn't present`));
		}

		return this.getSrid(analyticalUnitId).then(srid => {
			let filterSql = ` ORDER BY gid LIMIT ${filter.limit} OFFSET ${filter.offset}`;
			if(filter.filter) {
				filterSql = ` WHERE name ilike '%${filter.filter}%' ` + filterSql;
			}

            let sql = this.getSql(srid, analyticalUnitId, filterSql);

            return this._pool.query(sql).then(result => {
                return result.rows;
            });
		})
	}
}

module.exports = PgAnalyticalUnits;