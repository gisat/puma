let conn = require('../common/conn');
let logger = require('../common/Logger').applicationWideLogger;

let _ = require('underscore');

class AreaController {
	constructor(app, pgPool){
		this._pool = pgPool;

		app.get('/rest/area', this.read.bind(this));
	}

	/**
	 * It receives the list of layers to look for information and the latitude, longitude of the point and based on
	 * them it should return gids of all areas which contains given point. Basically it is used for Selection.
	 * @param request
	 * @param response
	 */
	read(request, response) {
		var latitude = request.query.latitude;
		var longitude = request.query.longitude;
		var layers = request.query.layers;

		var promises = [];
		layers.forEach(layer => {
			// Get table for the layer name with views.
			var tableWithSchema = conn.getLayerTable(layer);
			var sql = `SELECT gid FROM ${tableWithSchema} WHERE ST_Intersects(the_geom, ST_GeomFromText('POINT(${longitude} ${latitude})', 4326))`;
			logger.info(`AreaController#read Sql: `, sql);
			promises.push(this._pool.query(sql).then(result => {
				return result.rows;
			}));
		});

		Promise.all(promises).then(results => {
			var gids = _.pluck(_.flatten(results.rows), 'gid');
			response.json({areas: gids});
		}).catch(err => {
			logger.error(`AreaController#read Error: `, err);
			response.status(500).json({status: 'err'});
		})
	}
}

module.exports = AreaController;