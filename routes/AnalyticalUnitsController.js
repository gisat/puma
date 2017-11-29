let {MongoClient} = require(`mongodb`);

let config = require(`../config`);

let PgGeometry = require(`../data/PgGeometry`);
let FilteredBaseLayerReferences = require(`../layers/FilteredBaseLayerReferences`);

class AnalyticalUnitsController {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

		app.post(`/api/analyticalunits/geometry`, this.getAuGeometries.bind(this));
	}

	getAuGeometries(request, response, next) {
		return new Promise((resolve, reject) => {
			let filter = request.body.data;
			let placeId = filter.place;
			MongoClient.connect(config.mongoConnString)
				.then((mongoDb) => {
					return new FilteredBaseLayerReferences({location: Number(placeId)}, mongoDb).layerReferences();
				})
				.then((result) => {
					let tableName = result[0].layer.split(`:`)[1];
					let optionalColumns = {
						fid: result[0].fidColumn,
						name: result[0].nameColumn
					};
					return new PgGeometry(this._pgPool, `public`, tableName, `the_geom`, optionalColumns).json();
				})
				.then((geometry) => {
					resolve(geometry)
				})
				.catch((error) => {
					reject(error);
				})
		}).then((result) => {
			response.status(200).send(
				{
					data: result,
					success: true
				}
			)
		}).catch((error) => {
			response.status(500).send(
				{
					message: error.message,
					success: false
				}
			)
		});
	}
}

module.exports = AnalyticalUnitsController;