const zipper = require(`zip-local`);

const config = require(`../config`);

const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgSpecificCrud = require(`../specific/PgSpecificCrud`);
const PgRelationsCrud = require(`../relations/PgRelationsCrud`);

const PgPermission = require(`../security/PgPermissions`);

const esponFuoreApplicationKey = `esponFuore`;
const baseViewKey = `27aeef7e-186f-4b2b-983d-8f1f0fad36f3`;
const guestGroupKey = `2`;

class FuoreImporter {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);
		this._pgMetadataCrud = new PgMetadataCrud(pgPool, config.pgSchema.metadata);
		this._pgSpecificCrud = new PgSpecificCrud(pgPool, config.pgSchema.specific);
		this._pgRelationsCrud = new PgRelationsCrud(pgPool, config.pgSchema.relations);

		this._pgPermission = new PgPermission(pgPool, config.pgSchema.data);
	}

	async createAnalyticalUnitTable(analyticalUnitMetadata, unzippedFs) {
		let analyticalUnitTableName = `fuore-au-${analyticalUnitMetadata.table_name}`;
		let analyticalUnitData = JSON.parse(unzippedFs.read(analyticalUnitMetadata.name, 'text'));
		let analyticalUnitFeatures = analyticalUnitData.features;

		let analyticalUnitFeatureProperties = {};
		let analyticalUnitFeatureValues = [];

		_.each(analyticalUnitFeatures, (feature) => {
			let featureValues = {};
			_.each(feature.properties, (value, property) => {
				featureValues[property] = value;
				if (!analyticalUnitFeatureProperties.hasOwnProperty(property)) {
					let type = null;
					if (_.isString(value)) {
						type = `text`;
					} else if (_.isNumber(value)) {
						type = `numeric`
					}
					analyticalUnitFeatureProperties[property] = type;
				}
			});
			featureValues['geometry'] = JSON.stringify({...feature.geometry, crs: analyticalUnitData.crs});
			analyticalUnitFeatureValues.push(featureValues);
		});

		let auTableSql = [];
		auTableSql.push(`CREATE TABLE IF NOT EXISTS "${analyticalUnitTableName}" (`);

		let valueInsertsSql = [];
		let columnDefinitionSql = [];

		if (analyticalUnitFeatureProperties.hasOwnProperty('id')) {
			columnDefinitionSql.push(`"id" numeric primary key`);
			delete analyticalUnitFeatureProperties.id;
		} else {
			columnDefinitionSql.push(`"id" serial primary key`);
		}

		_.each(analyticalUnitFeatureProperties, (value, property) => {
			columnDefinitionSql.push(`"${property}" ${value}`);
		});

		columnDefinitionSql.push(`"geometry" geometry`);

		auTableSql.push(columnDefinitionSql.join(`, `));

		auTableSql.push(`);`);

		await this._pgPool.query(auTableSql.join(` `));

		await this._pgPool.query(_.map(analyticalUnitFeatureValues, (featureValues) => {
			return `INSERT INTO "${analyticalUnitTableName}" (${_.map(featureValues, (value, property) => {
				return `"${property}"`
			}).join(', ')}) VALUES (${_.map(featureValues, (value, property) => {
				return _.isString(value) ? property === 'geometry' ? `ST_GeomFromGeoJSON('${value}')` : `'${value.replace(`'`, `''`)}'` : value
			}).join(`, `)});`
		}).join(` `));
	}

	async ensureAnalyticalUnit(analyticalUnitMetadata, unzippedFs) {
		let isTableCreated = await this.isAnalyticalUnitsTableExisting(analyticalUnitMetadata);

		if (!unzippedFs.contents().includes(analyticalUnitMetadata.name) && !isTableCreated) {
			throw new Error(`missing file ${analyticalUnitMetadata.name}`);
		} else if (unzippedFs.contents().includes(analyticalUnitMetadata.name) && !isTableCreated) {
			await this.createAnalyticalUnitTable(analyticalUnitMetadata, unzippedFs);
		} else if (unzippedFs.contents().includes(analyticalUnitMetadata.name) && isTableCreated) {
			throw new Error(`analytical unit table ${analyticalUnitMetadata.name} already exists`);
		}

	}

	async isAnalyticalUnitsTableExisting(analyticalUnitMetadata) {
		let analyticalUnitTableName = `fuore-au-${analyticalUnitMetadata.table_name}`;
		return await this._pgPool
			.query(`SELECT count(*) FROM pg_tables WHERE "schemaname" = 'public' AND "tablename" = '${analyticalUnitTableName}';`)
			.then((pgResults) => {
				return !!(Number(pgResults.rows[0].count));
			});
	}

	async isAttributeDataTableExisting(attributeMetadata) {
		let attributeDataTableName = `fuore-attr-${attributeMetadata.table_name}`;
		return await this._pgPool
			.query(`SELECT count(*) FROM pg_tables WHERE "schemaname" = 'public' AND "tablename" = '${attributeDataTableName}';`)
			.then((pgResults) => {
				return !!(Number(pgResults.rows[0].count));
			});
	}

	async ensureAnalyticalUnits(unzippedFs) {
		return Promise.resolve()
			.then(async () => {
				if (unzippedFs.contents().includes('analytical_units.json')) {
					let analyticalUnits = JSON.parse(unzippedFs.read('analytical_units.json', 'text'));

					for (let analyticalUnitMetadata of analyticalUnits) {
						if (!analyticalUnitMetadata.hasOwnProperty(`table_name`)) {
							throw new Error(`missing table_name property in analytical unit metadata`);
						}

						if (!analyticalUnitMetadata.hasOwnProperty(`name`)) {
							throw new Error(`missing name property in analytical unit metadata`);
						}

						if (!analyticalUnitMetadata.hasOwnProperty(`type_of_region`)) {
							throw new Error(`missing type_of_region property in analytical unit metadata`);
						}

						if (!analyticalUnitMetadata.hasOwnProperty(`fid_column`)) {
							throw new Error(`missing fid_column property in analytical unit metadata`);
						}

						if (!analyticalUnitMetadata.hasOwnProperty(`name_column`)) {
							throw new Error(`missing name_column property in analytical unit metadata`);
						}

						if (!analyticalUnitMetadata.hasOwnProperty(`id`)) {
							throw new Error(`missing id property in analytical unit metadata`);
						}

						await this.ensureAnalyticalUnit(analyticalUnitMetadata, unzippedFs);
					}

					return analyticalUnits;
				} else {
					throw new Error(`missing analytical_units.json`);
				}
			});
	}

	async ensureAttributeData(attributeMetadata, unzippedFs) {
		let isTableCreated = await this.isAttributeDataTableExisting(attributeMetadata);

		// todo only for testing purposes
		console.log(`#### fuore import - skipping attribute table check`);
		isTableCreated = false;

		if (!unzippedFs.contents().includes(`${attributeMetadata.table_name}.json`) && !isTableCreated) {
			throw new Error(`missing ${attributeMetadata.table_name}.json`);
		} else if (unzippedFs.contents().includes(`${attributeMetadata.table_name}.json`) && isTableCreated) {
			throw new Error(`table for attribute '${attributeMetadata.name}' already exists`);
		} else if (unzippedFs.contents().includes(`${attributeMetadata.table_name}.json`) && !isTableCreated) {
			await this.createAttributeDataTable(attributeMetadata, unzippedFs);
		}
	}

	async createAttributeDataTable(attributeMetadata, unzippedFs) {
		let attributeDataTableName = `fuore-attr-${attributeMetadata.table_name}`;
		let attributeData = JSON.parse(unzippedFs.read(`${attributeMetadata.table_name}.json`, 'text'));

		let tableColumns = {};

		for (let attributeDataObject of attributeData) {
			_.each(attributeDataObject, (value, property) => {
				if (!tableColumns.hasOwnProperty(property)) {
					if (_.isString(value)) {
						tableColumns[property] = `text`;
					} else if (_.isNumber(value)) {
						tableColumns[property] = `numeric`;
					}
				}
			});
		}

		let sql = [];

		sql.push(`BEGIN;`);
		sql.push(`CREATE TABLE IF NOT EXISTS "public"."${attributeDataTableName}" (`);

		sql.push(`auto_fid serial primary key,`);

		let columnDefinitions = [];
		_.each(tableColumns, (type, column) => {
			columnDefinitions.push(`"${column}" ${type}`);
		});

		sql.push(columnDefinitions.join(`,\n`));

		sql.push(`);`);

		for (let attributeDataObject of attributeData) {
			let columnNames = [];
			let values = [];

			_.each(tableColumns, (type, columnName) => {
				columnNames.push(columnName);
				if (type === `text`) {
					values.push(`'${attributeDataObject[columnName].replace(`'`, `''`)}'`);
				} else {
					values.push(attributeDataObject[columnName]);
				}
			});

			sql.push(`INSERT INTO "public"."${attributeDataTableName}" ("${columnNames.join(`", "`)}") VALUES (${values.join(`, `)});`);
		}

		sql.push(`COMMIT;`);

		await this._pgPool.query(sql.join(`\n`));
	}

	ensureAttributesData(unzippedFs) {
		return Promise.resolve()
			.then(async () => {
				if (unzippedFs.contents().includes('attributes.json')) {
					let attributes = JSON.parse(unzippedFs.read('attributes.json', 'text'));
					for (let attributeMetadata of attributes) {
						if (!attributeMetadata.hasOwnProperty(`name`)) {
							throw new Error(`missing name property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`years`)) {
							throw new Error(`missing years property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`table_name`)) {
							throw new Error(`missing table_name property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`unit`)) {
							throw new Error(`missing unit property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`analytical_unit_id`)) {
							throw new Error(`missing analytical_unit_id property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`value_type`)) {
							throw new Error(`missing value_type property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`fid_column`)) {
							throw new Error(`missing fid_column property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`category`)) {
							throw new Error(`missing category property in metadata of attribute ${attributeMetadata.name}`);
						}

						await this.ensureAttributeData(attributeMetadata, unzippedFs);
					}

					return attributes;
				} else {
					throw new Error(`missing attributes.json`);
				}
			})
	}

	async createMetadata(group, filter, data, user) {
		return await this._pgMetadataCrud.get(group, {filter}, user)
			.then((metadataResults) => {
				if (metadataResults.data[group].length) {
					return metadataResults.data[group];
				} else {
					return this._pgMetadataCrud.create({[group]: [{data: data}]}, user)
						.then(([data, errors]) => {
							if (errors) {
								throw new Error(errors);
							} else {
								return data[group];
							}
						})
				}
			})
	}

	async createSpecific(group, filter, data, user) {
		return await this._pgSpecificCrud.get(group, {filter}, user)
			.then((metadataResults) => {
				if (metadataResults.data[group].length) {
					return metadataResults.data[group];
				} else {
					return this._pgSpecificCrud.create({[group]: [{data: data}]}, user)
						.then(([data, errors]) => {
							if (errors) {
								throw new Error(JSON.stringify(errors));
							} else {
								return data[group];
							}
						})
				}
			})
	}

	async createDataSource(group, filter, data, user) {
		return await this._pgDataSourcesCrud.get(group, {filter}, user)
			.then((metadataResults) => {
				if (metadataResults.data[group].length) {
					return metadataResults.data[group];
				} else {
					return this._pgDataSourcesCrud.create({[group]: [{data: data}]}, user)
						.then(([data, errors]) => {
							if (errors) {
								throw new Error(JSON.stringify(errors));
							} else {
								return data[group];
							}
						})
				}
			})
	}

	createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user) {
		return Promise.resolve()
			.then(async () => {
				let pantherScopes = [];
				for (let analyticalUnit of analyticalUnits) {
					await this.createMetadata(
						`scopes`,
						{
							nameInternal: analyticalUnit.type_of_region,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameInternal: analyticalUnit.type_of_region,
							applicationKey: esponFuoreApplicationKey
						},
						user
					).then((scopes) => {
						pantherScopes.push({
							...scopes[0],
							linkage: {
								analyticalUnitId: analyticalUnit.id,
								analyticalUnitFidColumn: analyticalUnit.fid_column,
								analyticalUnitNameColumn: analyticalUnit.name_column
							}
						})
					});
				}
				return pantherScopes;
			});
	}

	createPantherAttributesFromFuoreAttributes(attributes, user) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributes = [];
				for (let attribute of attributes) {
					await this.createMetadata(
						`attributes`,
						{
							nameInternal: attribute.name,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameInternal: attribute.name,
							nameDisplay: attribute.name,
							applicationKey: esponFuoreApplicationKey,
							description: attribute.unit,
							valueType: attribute.value_type
						},
						user
					).then((attributes) => {
						pantherAttributes.push({
							...attributes[0],
							linkage: {
								analyticalUnitId: attribute.analytical_unit_id,
								analyticalUnitFidColumn: attribute.fid_column,
								attributeId: attribute.id
							}
						})
					});
				}
				return pantherAttributes;
			});
	}

	createPantherPeriodsFromFuoreAttributes(attributes, user) {
		return Promise.resolve()
			.then(async () => {
				let pantherPeriods = [];
				for (let attribute of attributes) {
					let years = attribute.years.split(`-`);
					if (years.length !== 2) {
						throw new Error(`Years for attribute '${attribute.name}' has wrong format`)
					}

					for (let year = Number(years[0]); year <= Number(years[1]); year++) {
						if (!_.find(pantherPeriods, (pantherPeriod) => {
							return pantherPeriod.data.nameInternal === String(year);
						})) {
							await this.createMetadata(
								`periods`,
								{
									nameInternal: String(year),
									applicationKey: esponFuoreApplicationKey
								},
								{
									nameInternal: String(year),
									nameDisplay: String(year),
									period: String(year),
									applicationKey: esponFuoreApplicationKey
								},
								user
							).then((periods) => {
								pantherPeriods.push({
									...periods[0],
								})
							});
						}
					}
				}
				return pantherPeriods;
			});
	}

	createPantherTagsFromFuoreAttributes(attributes, user) {
		return Promise.resolve()
			.then(async () => {
				let pantherTags = [];
				for (let attribute of attributes) {
					await this.createMetadata(
						`tags`,
						{
							nameInternal: attribute.category,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameInternal: attribute.category,
							nameDisplay: attribute.category,
							applicationKey: esponFuoreApplicationKey
						},
						user
					).then((tags) => {
						pantherTags.push({
							...tags[0],
						})
					});
				}
				return pantherTags;
			});
	}

	createPantherEsponFuoreIndicatorsFromFuoreAttributes(attributes, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherEsponFuoreIndicators = [];
				for (let attribute of attributes) {
					let pantherAttribute = _.find(pantherData.attributes, (pantherAttribute) => {
						return pantherAttribute.data.nameInternal === attribute.name
					});
					let pantherAttributeKey = pantherAttribute ? pantherAttribute.key : null;

					let pantherScope = _.find(pantherData.scopes, (pantherScope) => {
						return pantherScope.linkage.analyticalUnitId === attribute.analytical_unit_id
					});
					let pantherScopeKey = pantherScope ? pantherScope.key : null;

					let pantherTag = _.find(pantherData.tags, (pantherTag) => {
						return pantherTag.data.nameInternal === attribute.category
					});
					let pantherTagKey = pantherTag ? pantherTag.key : null;

					await this.createSpecific(
						`esponFuoreIndicators`,
						{
							nameInternal: attribute.name
						},
						{
							nameInternal: attribute.name,
							nameDisplay: attribute.name,
							type: attribute.value_type,
							attributeKey: pantherAttributeKey,
							scopeKey: pantherScopeKey,
							tagKeys: [pantherTagKey],
							viewKey: baseViewKey,
						},
						user
					).then((esponFuoreIndicators) => {
						pantherEsponFuoreIndicators.push({
							...esponFuoreIndicators[0],
						})
					});
				}
				return pantherEsponFuoreIndicators;
			});
	}

	createPantherSpatialDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherSpatialDataSources = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au-${analyticalUnit.table_name}`;
					await this.createDataSource(
						`spatial`,
						{
							tableName: analyticalUnitTableName,
							type: `vector`
						},
						{
							tableName: analyticalUnitTableName,
							type: `vector`
						},
						user
					).then((spatialDataSources) => {
						pantherSpatialDataSources.push({
							...spatialDataSources[0],
							linkage: {
								analyticalUnitId: analyticalUnit.id,
								fidColumn: analyticalUnit.fid_column,
								nameColumn: analyticalUnit.name_column
							}
						})
					});
				}
				return pantherSpatialDataSources;
			});
	}

	createPantherAttributeDataSourceFromFuoreAttributes(attributes, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributeDataSources = [];
				for (let attribute of attributes) {
					let attributeTableName = `fuore-attr-${attribute.table_name}`;
					let years = attribute.years.split(`-`);
					if (years.length !== 2) {
						throw new Error(`Years for attribute '${attribute.name}' has wrong format`)
					}

					for(let year = Number(years[0]); year <= Number(years[1]); year++) {
						await this.createDataSource(
							`attribute`,
							{
								tableName: attributeTableName,
								columnName: String(year)
							},
							{
								tableName: attributeTableName,
								columnName: String(year)
							},
							user
						).then((attributeDataSources) => {
							pantherAttributeDataSources.push({
								...attributeDataSources[0],
								linkage: {
									analyticalUnitId: attribute.analytical_unit_id,
									fidColumn: attribute.fid_column,
									nameColumn: attribute.name_column
								}
							})
						});
					}
				}
				return pantherAttributeDataSources;
			});
	}

	import(data, user) {
		if (!data) {
			throw new Error(`missing zip package`);
		}

		let unzippedFs = zipper.sync.unzip(data.path).memory();
		let analyticalUnits;
		let attributes;
		let pantherData = {};

		return Promise.resolve()
			.then(() => {
				return this.ensureAnalyticalUnits(unzippedFs)
					.then((pAnalyticalUnits) => {
						analyticalUnits = pAnalyticalUnits;
					})
			})
			.then(() => {
				return this.ensureAttributesData(unzippedFs)
					.then((pAttributes) => {
						attributes = pAttributes;
					})
			})
			.then(() => {
				return this.createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user)
					.then((pantherScopes) => {
						pantherData.scopes = pantherScopes;
					})
			})
			.then(() => {
				return this.createPantherAttributesFromFuoreAttributes(attributes, user)
					.then((pantherAttributes) => {
						pantherData.attributes = pantherAttributes;
					})
			})
			.then(() => {
				return this.createPantherPeriodsFromFuoreAttributes(attributes, user)
					.then((pantherPeriods) => {
						pantherData.periods = pantherPeriods;
					})
			})
			.then(() => {
				return this.createPantherTagsFromFuoreAttributes(attributes, user)
					.then((pantherTags) => {
						pantherData.tags = pantherTags;
					})
			})
			.then(() => {
				return this.createPantherEsponFuoreIndicatorsFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherEsponFuoreIndicators) => {
						pantherData.esponFuoreIndicators = pantherEsponFuoreIndicators;
					})
			})
			.then(() => {
				return this.createPantherSpatialDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherSpatialDataSources) => {
						pantherData.spatialDataSources = pantherSpatialDataSources;
					})
			})
			.then(() => {
				// console.log(`#### analyticalUnits`, JSON.stringify(analyticalUnits));
				// console.log(`#### attributes`, JSON.stringify(attributes));
				// console.log(`#### pantherData scopes`, JSON.stringify(pantherData.scopes));
				// console.log(`#### pantherData attributes`, JSON.stringify(pantherData.attributes));
				console.log(`#### pantherData spatialDataSources`, JSON.stringify(pantherData.spatialDataSources));
			})
			.then(() => {
				return `All data were imported successfully.`;
			});

		// 	let layerTemplateDataTypeObject = null;
		// 	await this._pgMetadataCrud.get(`layerTemplates`, {
		// 		filter: {
		// 			nameInternal: attributeAuTableName,
		// 			applicationKey: esponFuoreApplicationKey
		// 		}
		// 	}, user)
		// 		.then((dataTypeResult) => {
		// 			layerTemplateDataTypeObject = dataTypeResult.data.layerTemplates[0];
		// 		});
		//
		// 	if (!layerTemplateDataTypeObject) {
		// 		await this._pgMetadataCrud.create({
		// 			layerTemplates: [{
		// 				data: {
		// 					nameInternal: attributeAuTableName,
		// 					nameDisplay: attributeAuTableName,
		// 					applicationKey: esponFuoreApplicationKey
		// 				}
		// 			}]
		// 		}, user)
		// 			.then(([data, errors]) => {
		// 				layerTemplateDataTypeObject = data.layerTemplates[0];
		// 			})
		// 	}
		//
		// 	await this._pgPermission.addGroup(guestGroupKey, `layerTemplate`, layerTemplateDataTypeObject.key, `GET`);
		//
		// 	let spatialRelationObject = null;
		// 	await this._pgRelationsCrud.get(`spatial`, {
		// 		filter: {
		// 			scopeKey: scopeDataTypeObject.key,
		// 			spatialDataSourceKey: spatialDataSourceObject.key,
		// 			layerTemplateKey: layerTemplateDataTypeObject.key
		// 		}
		// 	}, user)
		// 		.then((relationsResult) => {
		// 			spatialRelationObject = relationsResult.data.spatial[0];
		// 		});
		//
		// 	if (spatialRelationObject) {
		// 		await this._pgRelationsCrud.delete({spatial: [spatialRelationObject]}, user);
		// 	}
		//
		// 	await this._pgRelationsCrud.create({
		// 		spatial: [{
		// 			data: {
		// 				scopeKey: scopeDataTypeObject.key,
		// 				spatialDataSourceKey: spatialDataSourceObject.key,
		// 				layerTemplateKey: layerTemplateDataTypeObject.key,
		// 				fidColumnName: attributeAuFidColum
		// 			}
		// 		}]
		// 	}, user);
		//
		// 	let attributeRelationObjects = [];
		// 	await this._pgRelationsCrud.get(`attribute`, {
		// 		filter: {
		// 			scopeKey: scopeDataTypeObject.key,
		// 			attributeDataSourceKey: {
		// 				in: _.map(attributeDataSourceObjects, 'key')
		// 			},
		// 			layerTemplateKey: layerTemplateDataTypeObject.key,
		// 			periodKey: {
		// 				in: _.map(periodDataTypeObjects, 'key')
		// 			},
		// 			attributeKey: attributeDataTypeObject.key
		// 		}
		// 	}, user)
		// 		.then((relationsResult) => {
		// 			attributeRelationObjects = relationsResult.data.attribute;
		// 		});
		//
		// 	if (attributeRelationObjects.length) {
		// 		await this._pgRelationsCrud.delete({attribute: [attributeRelationObjects]}, user);
		// 	}
		//
		// 	let attributeRelationToCreateObjects = [];
		// 	_.each(attributeDataSourceObjects, (attributeDataSourceObject) => {
		// 		let attributeRelationObject = _.find(attributeRelationObjects, (attributeRelationObject) => {
		// 			return attributeRelationObject.data.attributeDataSourceKey === attributeDataSourceObject.key
		// 		});
		// 		if (!attributeRelationObject) {
		// 			attributeRelationToCreateObjects.push({
		// 				data: {
		// 					scopeKey: scopeDataTypeObject.key,
		// 					attributeDataSourceKey: attributeDataSourceObject.key,
		// 					layerTemplateKey: layerTemplateDataTypeObject.key,
		// 					periodKey: _.find(periodDataTypeObjects, (periodDataTypeObject) => {
		// 						return periodDataTypeObject.data.nameInternal === attributeDataSourceObject.data.columnName;
		// 					}).key,
		// 					attributeKey: attributeDataTypeObject.key,
		// 					fidColumnName: attributeFidColum
		// 				}
		// 			})
		// 		}
		// 	});
		//
		// 	if (attributeRelationToCreateObjects.length) {
		// 		await this._pgRelationsCrud.create({
		// 			attribute: attributeRelationToCreateObjects,
		// 		}, user);
		// 	}
		// }
		// });
	}
}

module.exports = FuoreImporter;