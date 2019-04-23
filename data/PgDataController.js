const config = require(`../config`);

const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);

class PgDataController {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);

		app.post(`/rest/data/filtered/spatial`, this.getSpatialData.bind(this));
		app.post(`/rest/data/filtered/attribute`, this.getAttributeData.bind(this));
	}

	async getSpatialData(request, response) {
		let filter = request.body.filter;
		let payload = {
			data: {
				spatial: []
			},
			success: true
		};

		if (filter && Object.keys(filter).length) {
			await this._pgDataSourcesCrud.get(`spatial`, {filter: {key: filter.spatialDataSourceKey}}, request.session.user)
				.then(async (spatialDataSources) => {
					if (spatialDataSources.errors) {
						payload.message = spatialDataSources.errors.spatial;
						payload.success = false;
					} else {
						spatialDataSources = spatialDataSources.data.spatial;

						for (let spatialDataSource of spatialDataSources) {
							if(spatialDataSource.data.type === `vector`) {
								await this.getGeometryColumnsForTableName(spatialDataSource.data.tableName)
									.then(async (geometryColumnNames) => {
										if (geometryColumnNames.length === 1) {
											let spatialData = await this.getSpatialVectorData(spatialDataSource.data.tableName, filter.fidColumnName, geometryColumnNames[0]);
											payload.data.spatial.push({
												spatialDataSourceKey: spatialDataSource.key,
												spatialData
											})
										} else {
											payload.data.spatial.push({
												spatialDataSourceKey: spatialDataSource.key,
												error: `unable to get spatial data for type ${spatialDataSource.data.type}`
											})
										}
									})
							}
						}
					}
				})
		} else {
			payload.message = `missing filter`;
			payload.success = false;
		}

		response
			.status(payload.success ? 200 : 400)
			.send(payload);
	}

	getAttributeData(request, response) {

	};

	getSpatialVectorData(tableName, fidColumn, geometryColumn) {
		return this._pgPool
			.query(`SELECT "${fidColumn}", ST_AsGeoJson("${geometryColumn}", 14, 4) AS geometry FROM "${tableName}"`)
			.then((pgResult) => {
				return {
					type: "FeatureCollection",
					features: _.map(pgResult.rows, (row) => {
						return {
							type: "Feature",
							geometry: JSON.parse(row.geometry),
							properties: {
								[fidColumn]: row[fidColumn]
							}
						}
					})
				}
			});
	}

	getColumNamesForTableName(tableName) {
		return this._pgPool
			.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`)
			.then((pgResult) => {
				return _.map(pgResult.rows, `column_name`);
			});
	}

	getGeometryColumnsForTableName(tableName) {
		return this.getColumNamesForTableName(tableName)
			.then((columnNames) => {
				return this._pgPool
					.query(`SELECT ${_.map(columnNames, (columnName) => {
						return `pg_typeof("${columnName}") AS "${columnName}"`
					}).join(', ')} FROM "${tableName}" LIMIT 1`)
					.then((pgResult) => {
						return _.compact(_.map(pgResult.rows[0], (type, columName) => {
							if (type === `geometry`) {
								return columName;
							}
						}));
					});
			});
	}
}

module.exports = PgDataController;