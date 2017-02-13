/**
 * It simply retrieves all the analytical units associated with given base layer references.
 */
class PgAnalyticalUnits {
	constructor(pool) {
		this._pool = pool;
	}

	all(analyticalUnitId) {
		this._pool.query(`SELECT Find_SRID('views', 'layer_${analyticalUnitId}', 'the_geom');`).then(result => {
			let srid = result.rows[0]["find_srid"];
			// not transform
			if (srid == 4326){
				return this._pool.query(`SELECT gid, name, ST_AsText(the_geom) FROM views.layer_${analyticalUnitId};`).then(result => {
					return result.rows;
				});
			}
			// transform
			else {
				return this._pool.query(`SELECT gid, name, ST_AsText(St_Transform(the_geom, 4326)) FROM views.layer_${analyticalUnitId};`).then(result => {
					return result.rows;
				});
			}
		});


		return this._pool.query(`SELECT gid, name, ST_AsText(St_Transform(the_geom, 4326)) FROM views.layer_${analyticalUnitId};`).then(result => {
			return result.rows;
		});
	}
}

module.exports = PgAnalyticalUnits;