let {MongoClient} = require(`mongodb`);

let config = require(`../config`);

let PgGeometry = require(`../data/PgGeometry`);
let FilteredBaseLayerReferences = require(`../layers/FilteredBaseLayerReferences`);
let FilteredMongoLocations = require(`../metadata/FilteredMongoLocations`);
let FilteredMongoScopes = require(`../metadata/FilteredMongoScopes`);

class AnalyticalUnitsController {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

		app.post(`/api/analyticalunits/geometry`, this.getAuGeometries.bind(this));
	}

	getAuGeometries(request, response, next) {
		return new Promise((resolve, reject) => {
			let filter = request.body;
			let placeId = filter.place;
			MongoClient.connect(config.mongoConnString)
				.then((mongoDb) => {
					return new FilteredMongoLocations({_id: Number(placeId)}, mongoDb).json()
						.then((results) => {
							if (results[0].geometry) {
								resolve(results[0].geometry);
							} else {
								new FilteredMongoScopes({_id: Number(results[0].dataset)}, mongoDb).json()
									.then((results) => {
										return new FilteredBaseLayerReferences(
											{
												location: Number(placeId),
												isData: false,
												areaTemplate: Number(results[0].featureLayers[0])
											},
											mongoDb
										).layerReferences();
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
							}
						})
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