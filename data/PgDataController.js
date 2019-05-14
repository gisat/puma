const pgTypes = require(`pg`).types;
const fse = require(`fs-extra`);
const zipper = require(`zip-local`);

const config = require(`../config`);

const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgSpecificCrud = require(`../specific/PgSpecificCrud`);
const PgRelationsCrud = require(`../relations/PgRelationsCrud`);

const esponFuoreApplicationKey = `esponFuore`;
const attributeAuFidColum = `FUA_CODE`;
const attributeFidColum = `fua_code`;
const baseViewKey = `27aeef7e-186f-4b2b-983d-8f1f0fad36f3`;

class PgDataController {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);
		this._pgMetadataCrud = new PgMetadataCrud(pgPool, config.pgSchema.metadata);
		this._pgSpecificCrud = new PgSpecificCrud(pgPool, config.pgSchema.specific);
		this._pgRelationsCrud = new PgRelationsCrud(pgPool, config.pgSchema.relations);

		// Pg returns numeric type as string, this is a hack to return is as number
		pgTypes.setTypeParser(1700, (value) => {
			return Number(value);
		});

		app.post(`/rest/data/filtered/spatial`, this.getSpatialData.bind(this));
		app.post(`/rest/data/filtered/attribute`, this.getAttributeData.bind(this));
		app.post(`/rest/statistic/filtered/attribute`, this.getAttributeDataStatistic.bind(this));

		app.post(`/rest/data/import/fuore`, this.importFuoreData.bind(this));
	}

	// todo work in progress - this method has to be split into simple methods
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
					let attributeContentData = JSON.parse(unzippedFs.read(`${attribute.table_name}.json`, 'text'));
					let attributeUnitDescription = attribute.unit;

					let attributeAuFeatures = attributeAuData.features;
					let attributeAuFeatureProperties = {};
					let attributeAuFeatureValues = [];

					let scopeName = attributeAu.type_of_region;
					let attributeIndicatorName = attribute.name;
					let years = _.range(Number(attribute.years.split(`-`)[0]), Number(attribute.years.split(`-`)[1]) + 1);
					let attributeType = attribute.absolute ? `absolute`: `relative`;

					_.each(attributeAuFeatures, (feature) => {
						let featureValues = {};
						_.each(feature.properties, (value, property) => {
							featureValues[property] = value;
							if (!attributeAuFeatureProperties.hasOwnProperty(property)) {
								let type = null;
								if (_.isString(value)) {
									type = `text`;
								} else if (_.isNumber(value)) {
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

					if (attributeAuFeatureProperties.hasOwnProperty('id')) {
						columnDefinitionSql.push(`"id" numeric primary key`);
						delete attributeAuFeatureProperties.id;
					} else {
						columnDefinitionSql.push(`"id" serial primary key`);
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

					let attributeTableSql = [];
					let attributeFeatureProperties = {};
					let attributeTableColumnsSql = [];
					let attributeTableDataSql = [];
					let attributeTableValues = [];

					for (let attributeData of attributeContentData) {
						let attributeValues = {};
						_.each(attributeData, (value, property) => {
							if (!attributeFeatureProperties.hasOwnProperty(property)) {
								let type = null;
								if (_.isString(value)) {
									type = `text`;
								} else if (_.isNumber(value)) {
									type = `numeric`
								}
								attributeFeatureProperties[property] = type;
							}
							attributeValues[property] = value;
						});
						attributeTableValues.push(attributeValues);
					}

					let attributeTableColumnDefinitionSql = [];

					if (attributeFeatureProperties.hasOwnProperty('id')) {
						attributeTableColumnDefinitionSql.push(`"id" numeric primary key`);
						delete attributeFeatureProperties.id;
					} else {
						attributeTableColumnDefinitionSql.push(`"id" serial primary key`);
					}

					_.each(attributeFeatureProperties, (value, property) => {
						attributeTableColumnDefinitionSql.push(`"${property}" ${value}`)
					});

					attributeTableSql.push(`CREATE TABLE "${attributeTableName}" (`);

					attributeTableSql.push(attributeTableColumnDefinitionSql.join(`, `));

					attributeTableSql.push(`);`);

					await this._pgPool.query(`DROP TABLE IF EXISTS "${attributeTableName}"`);

					await this._pgPool.query(attributeTableSql.join(` `));

					let attributeTableValuesSql = [];

					await this._pgPool.query(_.map(attributeTableValues, (attributeTableValueSet) => {
						return `INSERT INTO "${attributeTableName}" (${_.map(attributeTableValueSet, (value, property) => {
							return `"${property}"`
						}).join(', ')}) VALUES (${_.map(attributeTableValueSet, (value, property) => {
							return _.isString(value) ? `'${value.replace("'", "''")}'` : value === null ? `NULL` : value
						}).join(', ')});`
					}).join(` `));

					let scopeDataTypeObject = null;
					await this._pgMetadataCrud.get(`scopes`, {
						filter: {
							nameDisplay: scopeName,
							applicationKey: esponFuoreApplicationKey
						}
					}, request.session.user)
						.then((dataTypeResults) => {
							if (dataTypeResults.data.scopes.length) {
								scopeDataTypeObject = dataTypeResults.data.scopes[0];
							}
						});

					if (!scopeDataTypeObject) {
						await this._pgMetadataCrud.create({
							scopes: [{
								data: {
									nameDisplay: scopeName,
									applicationKey: esponFuoreApplicationKey
								}
							}]
						}, request.session.user)
							.then(([data, errors]) => {
								if (data.scopes.length) {
									scopeDataTypeObject = data.scopes[0];
								}
							})
					}


					let attributeDataTypeObject = null;
					await this._pgMetadataCrud.get(`attributes`, {
						filter: {
							nameDisplay: attributeIndicatorName,
							applicationKey: esponFuoreApplicationKey
						}
					}, request.session.user)
						.then((dataTypeResults) => {
							if (dataTypeResults.data.attributes.length) {
								attributeDataTypeObject = dataTypeResults.data.attributes[0];
							}
						});

					if (!attributeDataTypeObject) {
						await this._pgMetadataCrud.create({
							attributes: [{
								data: {
									nameDisplay: attributeIndicatorName,
									applicationKey: esponFuoreApplicationKey,
									description: attributeUnitDescription
								}
							}]
						}, request.session.user)
							.then(([data, errors]) => {
								if (data.attributes.length) {
									attributeDataTypeObject = data.attributes[0];
								}
							})
					}

					let periodDataTypeObjects = [];
					await this._pgMetadataCrud.get(`periods`, {
						filter: {
							nameDisplay: {
								in: _.map(years, _.toString),
								applicationKey: esponFuoreApplicationKey
							}
						}
					}, request.session.user)
						.then((dataTypeResults) => {
							periodDataTypeObjects = dataTypeResults.data.periods;
						});

					if (periodDataTypeObjects.length !== years.length) {
						let existingPeriods = _.map(periodDataTypeObjects, (periodDataTypeObject) => {
							return Number(periodDataTypeObject.data.nameDisplay)
						});
						let difference = _.difference(years, existingPeriods);

						await this._pgMetadataCrud.create({
							periods: _.map(difference, (year) => {
								return {
									data: {
										nameDisplay: String(year),
										period: String(year),
										applicationKey: esponFuoreApplicationKey
									}
								}
							})
						}, request.session.user)
							.then(([data, errors]) => {
								periodDataTypeObjects = _.concat(periodDataTypeObjects, data.periods);
							});
					}

					let tagDataTypeObject = null;
					await this._pgMetadataCrud.get(`tags`, {filter: {nameDisplay: "Indicators"}}, request.session.user)
						.then((dataTypeResults) => {
							if (dataTypeResults.data.tags.length) {
								tagDataTypeObject = dataTypeResults.data.tags[0];
							}
						});

					if (!tagDataTypeObject) {
						await this._pgMetadataCrud.create({
							tags: [{
								data: {
									nameDisplay: "Indicators",
									applicationKey: esponFuoreApplicationKey,
									scopeKey: scopeDataTypeObject.key
								}
							}]
						}, request.session.user)
							.then(([data, errors]) => {
								if (data.tags.length) {
									tagDataTypeObject = data.tags[0];
								}
							})
					}

					let esponFuoreIndicatorDataTypeObject = null;
					await this._pgSpecificCrud.get(`esponFuoreIndicators`, {filter: {nameDisplay: attributeIndicatorName}}, request.session.user)
						.then((dataTypeResults) => {
							if (dataTypeResults.data.esponFuoreIndicators.length) {
								esponFuoreIndicatorDataTypeObject = dataTypeResults.data.esponFuoreIndicators[0];
							}
						});

					if (!esponFuoreIndicatorDataTypeObject) {
						await this._pgSpecificCrud.create({
							esponFuoreIndicators: [{
								data: {
									nameDisplay: attributeIndicatorName,
									type: attributeType,
									attributeKey: attributeDataTypeObject.key,
									scopeKey: scopeDataTypeObject.key,
									tagKeys: [tagDataTypeObject.key],
									viewKey: baseViewKey
								}
							}]
						}, request.session.user)
							.then(([data, errors]) => {
								if (data.esponFuoreIndicators.length) {
									esponFuoreIndicatorDataTypeObject = data.esponFuoreIndicators[0];
								}
							})
					}

					let spatialDataSourceObject = null;
					await this._pgDataSourcesCrud.get(`spatial`, {
						filter: {
							tableName: attributeAuTableName,
							type: `vector`
						}

					}, request.session.user)
						.then((dataTypeResults) => {
							spatialDataSourceObject = dataTypeResults.data.spatial[0];
						});


					if (!spatialDataSourceObject) {
						await this._pgDataSourcesCrud.create({
							spatial: [{
								data: {
									tableName: attributeAuTableName,
									type: `vector`
								}
							}]
						}, request.session.user)
							.then(([data, errors]) => {
								if (data.spatial.length) {
									spatialDataSourceObject = data.spatial[0];
								}
							})
					}

					let attributeDataSourceObjects = [];
					await this._pgDataSourcesCrud.get(`attribute`, {
						filter: {
							tableName: attributeTableName,
							columnName: {
								in: _.map(periodDataTypeObjects, (periodDataTypeObject) => {
									return periodDataTypeObject.data.nameDisplay
								})
							}
						}
					}, request.session.user)
						.then((dataTypeResults) => {
							attributeDataSourceObjects = dataTypeResults.data.attribute;
						});

					if (attributeDataSourceObjects.length !== periodDataTypeObjects.length) {
						let attributeDataSourceObjectsToCreate = [];
						for (let periodDataTypeObject of periodDataTypeObjects) {
							let columnName = periodDataTypeObject.data.nameDisplay;
							let attributeDataSourceObject = _.find(attributeDataSourceObjects, {
								date: {
									tableName: attributeTableName,
									columnName
								}
							});
							if (!attributeDataSourceObject) {
								attributeDataSourceObjectsToCreate.push({
									data: {
										tableName: attributeTableName,
										columnName
									}
								});
							}
						}

						if (attributeDataSourceObjectsToCreate.length) {
							await this._pgDataSourcesCrud.create({attribute: attributeDataSourceObjectsToCreate}, request.session.user)
								.then(([data, errors]) => {
									attributeDataSourceObjects = _.concat(attributeDataSourceObjects, data.attribute);
								})
						}
					}

					let layerTemplateDataTypeObject = null;
					await this._pgMetadataCrud.get(`layerTemplates`, {
						filter: {
							nameDisplay: attributeAuTableName,
							applicationKey: esponFuoreApplicationKey
						}
					}, request.session.user)
						.then((dataTypeResult) => {
							layerTemplateDataTypeObject = dataTypeResult.data.layerTemplates[0];
						});

					if (!layerTemplateDataTypeObject) {
						await this._pgMetadataCrud.create({
							layerTemplates: [{
								data: {
									nameDisplay: attributeAuTableName,
									applicationKey: esponFuoreApplicationKey
								}
							}]
						}, request.session.user)
							.then(([data, errors]) => {
								layerTemplateDataTypeObject = data.layerTemplates[0];
							})
					}

					let spatialRelationObject = null;
					await this._pgRelationsCrud.get(`spatial`, {
						filter: {
							scopeKey: scopeDataTypeObject.key,
							spatialDataSourceKey: spatialDataSourceObject.key,
							layerTemplateKey: layerTemplateDataTypeObject.key
						}
					}, request.session.user)
						.then((relationsResult) => {
							spatialRelationObject = relationsResult.data.spatial[0];
						});

					if(spatialRelationObject) {
						await this._pgRelationsCrud.delete({spatial: [spatialRelationObject]}, request.session.user);
					}

					await this._pgRelationsCrud.create({
						spatial: [{
							data: {
								scopeKey: scopeDataTypeObject.key,
								spatialDataSourceKey: spatialDataSourceObject.key,
								layerTemplateKey: layerTemplateDataTypeObject.key,
								fidColumnName: attributeAuFidColum
							}
						}]
					}, request.session.user);

					let attributeRelationObjects = [];
					await this._pgRelationsCrud.get(`attribute`, {
						filter: {
							scopeKey: scopeDataTypeObject.key,
							attributeDataSourceKey: {
								in: _.map(attributeDataSourceObjects, 'key')
							},
							layerTemplateKey: layerTemplateDataTypeObject.key,
							periodKey: {
								in: _.map(periodDataTypeObjects, 'key')
							},
							attributeKey: attributeDataTypeObject.key
						}
					}, request.session.user)
						.then((relationsResult) => {
							attributeRelationObjects = relationsResult.data.attribute;
						});

					if(attributeRelationObjects.length) {
						await this._pgRelationsCrud.delete({attribute: [attributeRelationObjects]}, request.session.user);
					}

					let attributeRelationToCreateObjects = [];
					_.each(attributeDataSourceObjects, (attributeDataSourceObject) => {
						let attributeRelationObject = _.find(attributeRelationObjects, (attributeRelationObject) => {
							return attributeRelationObject.data.attributeDataSourceKey === attributeDataSourceObject.key
						});
						if (!attributeRelationObject) {
							attributeRelationToCreateObjects.push({
								data: {
									scopeKey: scopeDataTypeObject.key,
									attributeDataSourceKey: attributeDataSourceObject.key,
									layerTemplateKey: layerTemplateDataTypeObject.key,
									periodKey: _.find(periodDataTypeObjects, (periodDataTypeObject) => {
										return periodDataTypeObject.data.nameDisplay === attributeDataSourceObject.data.columnName;
									}).key,
									attributeKey: attributeDataTypeObject.key,
									fidColumnName: attributeFidColum
								}
							})
						}
					});

					if (attributeRelationToCreateObjects.length) {
						await this._pgRelationsCrud.create({
							attribute: attributeRelationToCreateObjects,
						}, request.session.user);
					}
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

	getAttributeDataSourceStatistic(tableName, attributeColumn, percentile) {
		let percentileSql = ``;
		if(percentile) {
			percentileSql = `(SELECT array_agg(a.percentile) AS percentile FROM (SELECT percentile_cont(k) WITHIN GROUP(ORDER BY "${attributeColumn}") AS percentile FROM "${tableName}", UNNEST(ARRAY[${percentile}]) AS k GROUP BY k) AS a) AS percentile,`
		}

		return this._pgPool
			.query(
				`
					SELECT 
					count("${attributeColumn}") as count, 
					min("${attributeColumn}") AS min, 
					max("${attributeColumn}") AS max,
					(SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY "${attributeColumn}") from "${tableName}") AS median,
					${percentileSql}
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
				attribute: []
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
							let attributeStatistic = await this.getAttributeDataSourceStatistic(attributeDataSource.data.tableName, attributeDataSource.data.columnName, filter.percentile);
							payload.data.attribute.push({
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
				attribute: []
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
							payload.data.attribute.push({
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