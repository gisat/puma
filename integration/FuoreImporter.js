const zipper = require(`zip-local`);
const uuidv4 = require(`uuid/v4`);

const config = require(`../config`);

const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgSpecificCrud = require(`../specific/PgSpecificCrud`);
const PgRelationsCrud = require(`../relations/PgRelationsCrud`);
const PgViewsCrud = require(`../view/PgViewsCrud`);

const PgPermission = require(`../security/PgPermissions`);

const esponFuoreApplicationKey = `esponFuore`;
const guestGroupKey = `2`;
const baseViewState = {
	"maps": {
		"maps": {
			"c4edaf02-f88a-47c8-a29e-3f53d3d544e2": {
				"key": "c4edaf02-f88a-47c8-a29e-3f53d3d544e2",
				"data": {
					"layers": [],
					"metadataModifiers": {
						"period": "periodKey"
					}
				}
			}
		},
		"sets": {
			"esponFuore": {
				"key": "esponFuore",
				"data": {
					"worldWindNavigator": {
						"roll": 0,
						"tilt": 0,
						"range": 1500000,
						"heading": 0,
						"lookAtLocation": {
							"latitude": 49,
							"longitude": 11
						}
					}
				},
				"maps": [
					"c4edaf02-f88a-47c8-a29e-3f53d3d544e2"
				],
				"sync": {
					"range": true,
					"location": true
				}
			}
		},
		"activeMapKey": "c4edaf02-f88a-47c8-a29e-3f53d3d544e2",
		"activeSetKey": "esponFuore"
	},
	"charts": {
		"sets": {
			"esponFuoreCharts": {
				"key": "esponFuoreCharts",
				"charts": [
					"columnChart1"
				]
			}
		},
		"charts": {
			"columnChart1": {
				"key": "columnChart1",
				"data": {
					"layerTemplate": null
				}
			}
		}
	},
	"scopes": {
		"activeKey": "scopeKey"
	},
	"periods": {
		"activeKeys": [
			"periodKey"
		]
	},
	"attributes": {
		"activeKey": "attributeKey"
	},
	"components": {
		"esponFuore_IndicatorSelect": {
			"activeCategory": "tagKey",
			"activeIndicator": "esponFuoreIndicatorKey",
			"indicatorSelectOpen": false
		}
	}
};

class FuoreImporter {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);
		this._pgMetadataCrud = new PgMetadataCrud(pgPool, config.pgSchema.metadata);
		this._pgSpecificCrud = new PgSpecificCrud(pgPool, config.pgSchema.specific);
		this._pgRelationsCrud = new PgRelationsCrud(pgPool, config.pgSchema.relations);
		this._pgViewsCrud = new PgViewsCrud(pgPool, config.pgSchema.views);

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

					let attributeIds = [];
					for (let attributeMetada of attributes) {
						if (attributeIds.includes(attributeMetada.id)) {
							throw new Error(`Attributes has non-unique ids`);
						} else {
							attributeIds.push(attributeMetada.id);
						}
					}

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

	async createMetadata(group, filter, data, user, key) {
		return await this._pgMetadataCrud.get(group, {filter}, user)
			.then((metadataResults) => {
				if (metadataResults.data[group].length) {
					return metadataResults.data[group];
				} else {
					let metadataObject = {
						data
					};
					if (key) {
						metadataObject.key = key;
					}

					return this._pgMetadataCrud.create({[group]: [metadataObject]}, user)
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

	async createView(group, filter, data, user) {
		return await this._pgViewsCrud.get(group, {filter}, user)
			.then((metadataResults) => {
				if (metadataResults.data[group].length) {
					return metadataResults.data[group];
				} else {
					return this._pgViewsCrud.create({[group]: [{data: data}]}, user)
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

	async createRelations(group, filter, data, user) {
		return await this._pgRelationsCrud.get(group, {filter}, user)
			.then((metadataResults) => {
				if (metadataResults.data[group].length) {
					return metadataResults.data[group];
				} else {
					return this._pgRelationsCrud.create({[group]: [{data: data}]}, user)
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

	createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, areaNameAttributeKey) {
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
							applicationKey: esponFuoreApplicationKey,
							configuration: {
								areaNameAttributeKey
							}
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

	createPantherViewsFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherViews = [];
				for (let analyticalUnit of analyticalUnits) {
					let state = _.cloneDeep(baseViewState);
					await this.createView(
						`views`,
						{
							nameInternal: `fuore-base-${analyticalUnit.type_of_region}`,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameDisplay: `fuore-base-${analyticalUnit.type_of_region}`,
							nameInternal: `fuore-base-${analyticalUnit.type_of_region}`,
							applicationKey: esponFuoreApplicationKey,
							state
						},
						user
					).then((views) => {
						pantherViews.push({
							...views[0],
							linkage: {
								analyticalUnitId: analyticalUnit.id
							}
						})
					})
				}
				return pantherViews;
			});
	}

	createPantherNameAttributeForFuore(key, user) {
		return Promise.resolve()
			.then(() => {
				return this.createMetadata(
					`attributes`,
					{
						nameInternal: `fuore_au_name`,
						applicationKey: esponFuoreApplicationKey
					},
					{
						nameInternal: `fuore_au_name`,
						nameDisplay: `fuore_au_name`,
						applicationKey: esponFuoreApplicationKey,
					},
					user,
					key
				)
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
								attributeFidColumn: attribute.fid_column,
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

	createPantherTagsFromFuoreAttributes(attributes, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherTags = [];
				for (let attribute of attributes) {
					let scope = _.find(pantherData.scopes, (pantherScope) => {
						return pantherScope.linkage.analyticalUnitId === attribute.analytical_unit_id;
					});

					if(!scope) {
						throw new Error(`unable to create metadata relation - internal error`);
					}

					await this.createMetadata(
						`tags`,
						{
							nameInternal: attribute.category,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameInternal: attribute.category,
							nameDisplay: attribute.category,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key
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

					let pantherView = _.find(pantherData.views, (pantherView) => {
						return pantherView.linkage.analyticalUnitId === attribute.analytical_unit_id;
					});
					let pantherViewKey = pantherView ? pantherView.key : null;

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
							viewKey: pantherViewKey,
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
								analyticalUnitFidColumn: analyticalUnit.fid_column,
								analyticalUnitNameColumn: analyticalUnit.name_column
							}
						})
					});
				}
				return pantherSpatialDataSources;
			});
	}

	createPantherNameAttributeDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributeDataSources = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au-${analyticalUnit.table_name}`;

					await this.createDataSource(
						`attribute`,
						{
							tableName: analyticalUnitTableName,
							columnName: analyticalUnit.name_column
						},
						{
							tableName: analyticalUnitTableName,
							columnName: analyticalUnit.name_column
						},
						user
					).then((attributeDataSources) => {
						pantherAttributeDataSources.push({
							...attributeDataSources[0],
							linkage: {
								analyticalUnitId: analyticalUnit.id,
								attributeFidColumn: analyticalUnit.fid_column,
								attributeNameColumn: analyticalUnit.name_column,
								isAnalyticalUnitName: true
							}
						})
					});
				}
				return pantherAttributeDataSources;
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

					for (let year = Number(years[0]); year <= Number(years[1]); year++) {
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
									attributeId: attribute.id,
									analyticalUnitId: attribute.analytical_unit_id,
									attributeFidColumn: attribute.fid_column,
									attributeNameColumn: attribute.name_column
								}
							})
						});
					}
				}
				return pantherAttributeDataSources;
			});
	}

	createPantherLayerTemplatesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherLayerTemplates = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au-${analyticalUnit.table_name}`;

					await this.createMetadata(
						`layerTemplates`,
						{
							nameInternal: analyticalUnitTableName,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameInternal: analyticalUnitTableName,
							nameDisplay: analyticalUnitTableName,
							applicationKey: esponFuoreApplicationKey
						},
						user
					).then((layerTemplates) => {
						pantherLayerTemplates.push({
							...layerTemplates[0],
							linkage: {
								analyticalUnitId: analyticalUnit.id,
								analyticalUnitFidColumn: analyticalUnit.fid_column,
								analyticalUnitNameColumn: analyticalUnit.name_column
							}
						})
					});
				}
				return pantherLayerTemplates;
			});
	}

	createPantherSpatialRelations(pantherData, user) {
		return Promise.resolve()
			.then(async () => {
				for (let scope of pantherData.scopes) {
					let spatialDataSource = _.find(pantherData.spatialDataSources, (spatialDataSource) => {
						return spatialDataSource.linkage.analyticalUnitId === scope.linkage.analyticalUnitId
					});
					let layerTemplate = _.find(pantherData.layerTemplates, (layerTemplate) => {
						return layerTemplate.linkage.analyticalUnitId === scope.linkage.analyticalUnitId
					});

					if (!scope || !spatialDataSource || !layerTemplate) {
						throw new Error(`unable to create spatial relations - internal error`);
					}

					await this.createRelations(
						`spatial`,
						{
							scopeKey: scope.key,
							spatialDataSourceKey: spatialDataSource.key,
							layerTemplateKey: layerTemplate.key,
							fidColumnName: scope.linkage.analyticalUnitFidColumn
						},
						{
							scopeKey: scope.key,
							spatialDataSourceKey: spatialDataSource.key,
							layerTemplateKey: layerTemplate.key,
							fidColumnName: scope.linkage.analyticalUnitFidColumn
						},
						user
					);
				}
			});
	}

	createPantherAttributeRelations(pantherData, user) {
		return Promise.resolve()
			.then(async () => {
				for (let attributeDataSource of pantherData.attributeDataSources) {
					let scope = _.find(pantherData.scopes, (scope) => {
						return scope.linkage.analyticalUnitId === attributeDataSource.linkage.analyticalUnitId
					});
					let layerTemplate = _.find(pantherData.layerTemplates, (layerTemplate) => {
						return layerTemplate.linkage.analyticalUnitId === attributeDataSource.linkage.analyticalUnitId
					});
					let period = _.find(pantherData.periods, (period) => {
						return period.data.nameInternal === attributeDataSource.data.columnName;
					});
					let attribute = _.find(pantherData.attributes, (attribute) => {
						return attribute.linkage.attributeId === attributeDataSource.linkage.attributeId;
					});

					if(!attribute && attributeDataSource.linkage.isAnalyticalUnitName) {
						attribute = {
							...pantherData.fuoreAuNameAttribute,
							linkage: {
								attributeFidColumn: attributeDataSource.linkage.attributeFidColumn
							}
						};
						period = {key: null};
					}

					if (!scope || !layerTemplate || !period || !attribute) {
						throw new Error(`unable to create attribute relations - internal error`);
					}

					await this.createRelations(
						`attribute`,
						{
							scopeKey: scope.key,
							attributeDataSourceKey: attributeDataSource.key,
							layerTemplateKey: layerTemplate.key,
							periodKey: period.key,
							attributeKey: attribute.key,
							fidColumnName: attribute.linkage.attributeFidColumn
						},
						{
							scopeKey: scope.key,
							attributeDataSourceKey: attributeDataSource.key,
							layerTemplateKey: layerTemplate.key,
							periodKey: period.key,
							attributeKey: attribute.key,
							fidColumnName: attribute.linkage.attributeFidColumn
						},
						user
					)
				}
			});
	}

	setGuestPermissionsForPantherData(pantherData) {
		return Promise.resolve()
			.then(() => {

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
				return this.createPantherNameAttributeForFuore(uuidv4(), user)
					.then((pantherAttributes) => {
						pantherData.fuoreAuNameAttribute = pantherAttributes[0];
					});
			})
			.then(() => {
				return this.createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData.fuoreAuNameAttribute.key)
					.then((pantherScopes) => {
						pantherData.scopes = pantherScopes;
					})
			})
			.then(() => {
				return this.createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData.fuoreAuNameAttribute.key)
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
				return this.createPantherTagsFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherTags) => {
						pantherData.tags = pantherTags;
					})
			})
			.then(() => {
				return this.createPantherViewsFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherViews) => {
						pantherData.views = pantherViews;
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
				return this.createPantherAttributeDataSourceFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherAttributeDataSources) => {
						pantherData.attributeDataSources = pantherAttributeDataSources;
					});
			})
			.then(() => {
				return this.createPantherNameAttributeDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user)
					.then((pantherAttributeDataSources) => {
						pantherData.attributeDataSources = _.concat(pantherData.attributeDataSources, pantherAttributeDataSources);
					})
			})
			.then(() => {
				return this.createPantherLayerTemplatesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTemplates) => {
						pantherData.layerTemplates = pantherLayerTemplates;
					});
			})
			.then(() => {
				return this.createPantherSpatialRelations(pantherData, user);
			})
			.then(() => {
				return this.createPantherAttributeRelations(pantherData, user);
			})
			.then(() => {
				return this.setGuestPermissionsForPantherData(pantherData);
			})
			.then(() => {
				return `All data were imported successfully.`;
			});
	}
}

module.exports = FuoreImporter;