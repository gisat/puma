const fse = require(`fs-extra`);
const zipper = require(`zip-local`);

const config = require(`../config`);

const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);

class PgDataController {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);

		app.post(`/rest/data/filtered/spatial`, this.getSpatialData.bind(this));
		app.post(`/rest/data/filtered/attribute`, this.getAttributeData.bind(this));
		app.post(`/rest/statistic/filtered/attribute`, this.getAttributeDataStatistic.bind(this));

		app.post(`/rest/data/import/fuore`, this.importFuoreData.bind(this));
	}

	async importFuoreData(request, response) {
		let requestFileObject = request.files && request.files.file;
		if (requestFileObject) {
			let unzippedFs = zipper.sync.unzip(requestFileObject.path).memory();
			let analyticalUnits, attributes;
			let done = true;
			if (unzippedFs.contents().includes('analytical_units.json')) {
				analyticalUnits = JSON.parse(unzippedFs.read('analytical_units.json', 'text'));
				_.each(analyticalUnits, (analyticalUnit) => {
					if (!unzippedFs.contents().includes(analyticalUnit.name)) {
						done = false;
						response.status(400).send({message: `missing analytical unit`, success: false});
						return false;
					}
				});
			} else {
				done = false;
				response.status(400).send({message: "missing mandatory files", success: false});
			}

			if (unzippedFs.contents().includes('attribute.json')) {
				attributes = JSON.parse(unzippedFs.read('attribute.json', 'text'));
				_.each(attributes, (attribute) => {
					if (!unzippedFs.contents().includes(`${attribute.table_name}.json`)) {
						done = false;
						response.status(400).send({message: `missing attribute data`, success: false});
						return false;
					}
				});
			} else {
				done = false;
				response.status(400).send({message: "missing mandatory files", success: false});
			}

			if (done) {
				for (let attribute of attributes) {
					let attributeTableName = `fuore-attr-${attribute.table_name}-${attribute.code}`;
					let attributeAu = _.find(analyticalUnits, {id: attribute.analytical_unit_id});
					let attributeAuTableName = `fuore-au-${attributeAu.table_name}`;
					let attributeAuParentTableName = attributeAu.parent_table ? `fuore-au-${attributeAu.parent_table}` : null;
					let attributeAuData = JSON.parse(unzippedFs.read(attributeAu.name, 'text'));
					let attributeData = JSON.parse(unzippedFs.read(`${attribute.table_name}.json`, 'text'));

					// console.log(attributeTableName);
					// console.log(attributeAuTableName);
					// console.log(attributeAuParentTableName);
					// console.log(attributeAuData);
					// console.log(attributeData);

					let attributeAuFeatures = attributeAuData.features;
					let attributeAuFeatureProperties = {};
					let attributeAuFeatureValues = [];

					_.each(attributeAuFeatures, (feature) => {
						let featureValues = {};
						_.each(feature.properties, (value, property) => {
							featureValues[property] = value;
							if(!attributeAuFeatureProperties.hasOwnProperty(property)) {
								let type = null;
								if (_.isString(value)) {
									type = `text`;
								} else if(_.isNumber(value)) {
									type = `numeric`
								}
								attributeAuFeatureProperties[property] = type;
							}
						});
						featureValues['geometry'] = JSON.stringify({...feature.geometry, crs: attributeAuData.crs});
						attributeAuFeatureValues.push(featureValues);
					});

					let auTableSql = [];
					auTableSql.push(`CREATE TABLE "${attributeAuTableName}" (`);

					let valueInsertsSql = [];
					let columnDefinitionSql = [];
					columnDefinitionSql.push(`"id" numeric primary key`);
					if(attributeAuFeatureProperties.hasOwnProperty('id')) {
						delete attributeAuFeatureProperties.id;
					}

					_.each(attributeAuFeatureProperties, (value, property) => {
						columnDefinitionSql.push(`"${property}" ${value}`);
					});

					columnDefinitionSql.push(`"geometry" geometry`);

					auTableSql.push(columnDefinitionSql.join(`, `));

					auTableSql.push(`);`);

					await this._pgPool.query(`DROP TABLE IF EXISTS "${attributeAuTableName}"`);

					await this._pgPool.query(auTableSql.join(` `));

					await this._pgPool.query(_.map(attributeAuFeatureValues, (featureValues) => {
						return `INSERT INTO "${attributeAuTableName}" (${_.map(featureValues, (value, property) => {
							return `"${property}"`
						}).join(', ')}) VALUES (${_.map(featureValues, (value, property) => {
							return _.isString(value) ? property === 'geometry' ? `ST_GeomFromGeoJSON('${value}')` : `'${value.replace(`'`, `''`)}'` : value
						}).join(`, `)});`
					}).join(` `));
				}

				response.status(200).send({imported: true, success: true});
			}

		} else {
			response.status(400).send({message: "missing file", success: false});
		}

		this.cleanupRequestFiles(request);
	};

	cleanupRequestFiles(request) {
		_.each(request.files, (fileObject) => {
			console.log(`### CLEANUP ###`);
			console.log(`@@@ FILE ${fileObject.path}`);
			fse.removeSync(fileObject.path);
			console.log(`@@@@ REMOVED`);
		});
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
							if (spatialDataSource.data.type === `vector`) {
								await this.getGeometryColumnsForTableName(spatialDataSource.data.tableName)
									.then(async (geometryColumnNames) => {
										if (geometryColumnNames.length === 1) {
											let spatialData = await this.getSpatialDataSourceData(spatialDataSource.data.tableName, filter.fidColumnName, geometryColumnNames[0]);
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

	getAttributeDataSourceStatistic(tableName, attributeColumn) {
		return this._pgPool
			.query(
				`
					SELECT 
					count("${attributeColumn}") as count, 
					min("${attributeColumn}") AS min, 
					max("${attributeColumn}") AS max,
					(SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY "${attributeColumn}") from "${tableName}") AS median,
					(SELECT pg_typeof("${attributeColumn}") FROM "${tableName}" LIMIT 1) AS type 
					FROM "${tableName}";
	  			`
			)
			.then((pgResult) => {
				if (pgResult.rows.length) {
					let statistic = pgResult.rows[0];
					switch (statistic.type) {
						case `character varying`:
						case `character`:
						case `text`:
							statistic.type = `text`;
							break;
						case `integer`:
						case `bigint`:
						case `bigserial`:
						case `bit`:
						case `serial`:
							statistic.type = `numeric`;
							break;
						case `boolean`:
							statistic.type = `boolean`;
							break;
					}
					return {
						...statistic
					}
				}
			});
	}

	async getAttributeDataStatistic(request, response) {
		let filter = request.body.filter;
		let payload = {
			data: {
				spatial: []
			},
			success: true
		};

		if (filter && Object.keys(filter).length) {
			await this._pgDataSourcesCrud.get(`attribute`, {filter: {key: filter.attributeDataSourceKey}}, request.session.user)
				.then(async (attributeDataSources) => {
					if (attributeDataSources.errors) {
						payload.message = attributeDataSources.errors.attribute;
						payload.success = false;
					} else {
						attributeDataSources = attributeDataSources.data.attribute;

						for (let attributeDataSource of attributeDataSources) {
							let attributeStatistic = await this.getAttributeDataSourceStatistic(attributeDataSource.data.tableName, attributeDataSource.data.columnName);
							payload.data.spatial.push({
								attributeDataSourceKey: attributeDataSource.key,
								attributeStatistic
							});
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

	async getAttributeData(request, response) {
		let filter = request.body.filter;
		let payload = {
			data: {
				spatial: []
			},
			success: true
		};

		if (filter && Object.keys(filter).length) {
			await this._pgDataSourcesCrud.get(`attribute`, {filter: {key: filter.attributeDataSourceKey}}, request.session.user)
				.then(async (attributeDataSources) => {
					if (attributeDataSources.errors) {
						payload.message = attributeDataSources.errors.attribute;
						payload.success = false;
					} else {
						attributeDataSources = attributeDataSources.data.attribute;

						for (let attributeDataSource of attributeDataSources) {
							let attributeData = await this.getAttributeDataSourceData(attributeDataSource.data.tableName, filter.fidColumnName, attributeDataSource.data.columnName);
							payload.data.spatial.push({
								attributeDataSourceKey: attributeDataSource.key,
								attributeData
							});
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
	};

	getAttributeDataSourceData(tableName, fidColumn, attributeColumn) {
		return this._pgPool
			.query(`SELECT "${fidColumn}", "${attributeColumn}" FROM "${tableName}"`)
			.then((pgResult) => {
				return {
					type: "FeatureCollection",
					features: _.map(pgResult.rows, (row) => {
						return {
							type: "Feature",
							properties: {
								[fidColumn]: row[fidColumn],
								[attributeColumn]: row[attributeColumn]
							}
						}
					})
				}
			});
	}

	getSpatialDataSourceData(tableName, fidColumn, geometryColumn) {
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