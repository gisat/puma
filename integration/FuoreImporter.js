const zipper = require(`zip-local`);
const uuidv4 = require(`uuid/v4`);
const _ = require(`lodash`);

const config = require(`../config`);

const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgSpecificCrud = require(`../specific/PgSpecificCrud`);
const PgRelationsCrud = require(`../relations/PgRelationsCrud`);
const PgViewsCrud = require(`../view/PgViewsCrud`);
const PgApplicationsCrud = require(`../application/PgApplicationsCrud`);

const PgPermission = require(`../security/PgPermissions`);

const esponFuoreApplicationKey = `esponFuore`;
const guestGroupKey = `2`;
const baseViewState = {
	"maps": {
		"maps": {
			"c4edaf02-f88a-47c8-a29e-3f53d3d544e2": {
				"key": "c4edaf02-f88a-47c8-a29e-3f53d3d544e2",
				"data": {
					"layers": [
						{
							"key": "afb2cee7-778d-4156-9df5-4e9b14d8e0fe",
							"layerTemplate": "layerTemplateKey"
						}
					],
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
					"columnChart1",
					"progressChart"
				]
			}
		},
		"charts": {
			"columnChart1": {
				"key": "columnChart1",
				"data": {
					"layerTemplate": "layerTemplateKey"
				}
			},
			"progressChart": {
				"key": "progressChart",
				"data": {
					"title": "Progress",
					"periods": [
						"periodKeyEvery5Years"
					],
					"layerTemplate": "layerTemplateKey"
				}
			}
		}
	},
	"periods": {
		"activeKeys": [
			"periodKey"
		]
	}
};

const baseLayerTreeStructure = [
	{
		"layers": [
			{
				"key": "QQQQQy",
				"icon": "",
				"type": "folder",
				"items": [
					{
						"key": "layerTemplateKey",
						"type": "layerTemplate",
						"visible": true
					}
				],
				"title": "aaa",
				"expanded": true
			}
		]
	}
];

class FuoreImporter {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);
		this._pgMetadataCrud = new PgMetadataCrud(pgPool, config.pgSchema.metadata);
		this._pgSpecificCrud = new PgSpecificCrud(pgPool, config.pgSchema.specific);
		this._pgRelationsCrud = new PgRelationsCrud(pgPool, config.pgSchema.relations);
		this._pgViewsCrud = new PgViewsCrud(pgPool, config.pgSchema.views);
		this._pgApplicationsCrud = new PgApplicationsCrud(pgPool, config.pgSchema.application);

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

		let inserts = _.map(analyticalUnitFeatureValues, (featureValues) => {
			return `INSERT INTO "${analyticalUnitTableName}" (${_.map(featureValues, (value, property) => {
				return `"${property}"`
			}).join(', ')}) VALUES (${_.map(featureValues, (value, property) => {
				let type = analyticalUnitFeatureProperties[property];
				if (property === `geometry`) {
					return `ST_GeomFromGeoJSON('${value}')`;
				} else if (type === `text`) {
					if (value !== null) {
						return `'${value.replace(/'/g, `''`)}'`;
					} else {
						return `NULL`;
					}
				} else if (type === `numeric`) {
					if (value !== null) {
						return value;
					} else {
						return `NULL`;
					}
				}
			}).join(`, `)});`
		}).join(`\n`);

		await this._pgPool.query(inserts);
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
				if (!tableColumns.hasOwnProperty(property) || !tableColumns[property]) {
					if (_.isString(value)) {
						tableColumns[property] = `text`;
					} else if (_.isNumber(value)) {
						tableColumns[property] = `numeric`;
					} else {
						tableColumns[property] = null;
					}
				}
			});

			_.each(tableColumns, (value, property) => {
				if (!value) {
					tableColumns[property] = `numeric`;
				}
			});
		}

		let sql = [];

		sql.push(`BEGIN;`);

		sql.push(`DROP TABLE IF EXISTS "public"."${attributeDataTableName}";`);

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
				if (attributeDataObject[columnName] === null) {
					values.push(`NULL`);
				} else {
					if (type === `text`) {
						values.push(`'${attributeDataObject[columnName].replace(`'`, `''`)}'`);
					} else {
						values.push(attributeDataObject[columnName]);
					}
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

	async createApplication(group, filter, data, user) {
		return await this._pgApplicationsCrud.get(group, {filter}, user)
			.then((metadataResults) => {
				if (metadataResults.data[group].length) {
					return metadataResults.data[group];
				} else {
					return this._pgApplicationsCrud.create({[group]: [{data: data}]}, user)
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
							nameDisplay: analyticalUnit.type_of_region,
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

					let layerTemplate = _.find(pantherData.layerTemplates, (pantherLayerTemplate) => {
						return pantherLayerTemplate.linkage.analyticalUnitId === analyticalUnit.id;
					});

					let attributes = _.filter(pantherData.attributes, (pantherAttribute) => {
						return pantherAttribute.linkage.analyticalUnitId === analyticalUnit.id;
					});

					if (!layerTemplate || !attributes.length) {
						throw new Error(`unable to create internal data structure - #ERR01`);
					}

					let commonYearValues = _.intersection(..._.map(attributes, (attribute) => {
						return attribute.linkage.years;
					}));

					let availableYearValues = _.uniq(_.flatten(_.map(attributes, (attribute) => {
						return attribute.linkage.years;
					})));

					let intervalYearValues = [
						_.nth(availableYearValues, 0),
						_.nth(availableYearValues, (availableYearValues.length / 2) - 1),
						_.nth(availableYearValues, availableYearValues.length - 1)
					];

					let activeYearValue = commonYearValues.length ? _.last(commonYearValues) : _.last(availableYearValues);

					let activeYearPeriodKey = _.find(pantherData.periods, (pantherPeriod) => {
						return pantherPeriod.data.nameInternal === String(activeYearValue);
					}).key;

					let intervalYearPeriodKeys = _.map(intervalYearValues, (intervalYearValue) => {
						return _.find(pantherData.periods, (pantherPeriod) => {
							return pantherPeriod.data.nameInternal === String(intervalYearValue);
						}).key;
					});

					state.maps.maps["c4edaf02-f88a-47c8-a29e-3f53d3d544e2"].data.layers[0].layerTemplate = layerTemplate.key;
					state.maps.maps["c4edaf02-f88a-47c8-a29e-3f53d3d544e2"].data.metadataModifiers.period = activeYearPeriodKey;
					state.charts.charts.columnChart1.data.layerTemplate = layerTemplate.key;
					state.charts.charts.progressChart.data.periods = intervalYearPeriodKeys;
					state.charts.charts.progressChart.data.layerTemplate = layerTemplate.key;
					state.periods.activeKeys = [activeYearPeriodKey];

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

	createPantherLayerTreesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherLayerTrees = [];
				for (let analyticalUnit of analyticalUnits) {
					let structure = _.cloneDeep(baseLayerTreeStructure);

					let layerTemplate = _.find(pantherData.layerTemplates, (pantherLayerTemplate) => {
						return pantherLayerTemplate.linkage.analyticalUnitId === analyticalUnit.id;
					});

					let scope = _.find(pantherData.scopes, (pantherScope) => {
						return pantherScope.linkage.analyticalUnitId === analyticalUnit.id;
					});

					if (!layerTemplate || !scope) {
						throw new Error(`unable to create internal data structure - #ERR02`);
					}

					structure[0].layers[0].items[0].key = layerTemplate.key;

					await this.createApplication(
						`layerTrees`,
						{
							nameInternal: `fuore-base-${analyticalUnit.type_of_region}`,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key
						},
						{
							nameInternal: `fuore-base-${analyticalUnit.type_of_region}`,
							structure,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key,
						},
						user
					).then((layerTrees) => {
						pantherLayerTrees.push({
							...layerTrees[0],
							linkage: {
								analyticalUnitId: analyticalUnit.id
							}
						})
					})
				}
				return pantherLayerTrees;
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

	createPantherAttributesFromFuoreAttributes(attributes, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributes = [];
				for (let attribute of attributes) {
					let scope = _.find(pantherData.scopes, (pantherScope) => {
						return pantherScope.linkage.analyticalUnitId === attribute.analytical_unit_id;
					});

					if (!scope) {
						throw new Error(`unable to create internal data structure - #ERR07`);
					}

					let attributeNameInternal = `${attribute.name} - ${scope.data.nameInternal} - ${attribute.id}`;

					await this.createMetadata(
						`attributes`,
						{
							nameInternal: attributeNameInternal,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameInternal: attributeNameInternal,
							nameDisplay: attribute.name,
							applicationKey: esponFuoreApplicationKey,
							description: attribute.unit,
							valueType: attribute.value_type
						},
						user
					).then((attributes) => {
						let years = [];
						for (let year = Number(attribute.years.split(`-`)[0]); year <= Number(attribute.years.split(`-`)[1]); year++) {
							years.push(year);
						}

						pantherAttributes.push({
							...attributes[0],
							linkage: {
								analyticalUnitId: attribute.analytical_unit_id,
								attributeFidColumn: attribute.fid_column,
								attributeId: attribute.id,
								years
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
									...periods[0]
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

					if (!scope) {
						throw new Error(`unable to create internal data structure - #ERR03`);
					}

					let tagNameInternal = `${attribute.category} - ${scope.data.nameInternal}`;

					await this.createMetadata(
						`tags`,
						{
							nameInternal: tagNameInternal,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key
						},
						{
							nameInternal: tagNameInternal,
							nameDisplay: attribute.category,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key
						},
						user
					).then((tags) => {
						pantherTags.push({
							...tags[0],
							linkage: {
								analytical_unit_id: attribute.analytical_unit_id,
								attributeId: attribute.id
							}
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
					let pantherScope = _.find(pantherData.scopes, (pantherScope) => {
						return pantherScope.linkage.analyticalUnitId === attribute.analytical_unit_id
					});
					let pantherScopeKey = pantherScope ? pantherScope.key : null;

					let pantherAttribute = _.find(pantherData.attributes, (pantherAttribute) => {
						let attributeNameInternal = `${attribute.name} - ${pantherScope && pantherScope.data.nameInternal} - ${attribute.id}`;
						return pantherAttribute.data.nameInternal === attributeNameInternal;
					});
					let pantherAttributeKey = pantherAttribute ? pantherAttribute.key : null;

					let pantherTag = _.find(pantherData.tags, (pantherTag) => {
						let tagNameInternal = `${attribute.category} - ${pantherScope && pantherScope.data.nameInternal}`;
						return pantherTag.linkage.attributeId === attribute.id && pantherTag.data.nameInternal === tagNameInternal;
					});
					let pantherTagKey = pantherTag ? pantherTag.key : null;

					let pantherView = _.find(pantherData.views, (pantherView) => {
						return pantherView.linkage.analyticalUnitId === attribute.analytical_unit_id;
					});
					let pantherViewKey = pantherView ? pantherView.key : null;

					if (!pantherAttribute || !pantherScope || !pantherTag || !pantherView) {
						throw new Error(`unable to create internal data structure - #ERR04`);
					}

					let indicatorNameInternal = `${attribute.name} - ${pantherScope.data.nameInternal}`;

					await this.createSpecific(
						`esponFuoreIndicators`,
						{
							nameInternal: indicatorNameInternal
						},
						{
							nameInternal: indicatorNameInternal,
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
						throw new Error(`unable to create internal data structure - #ERR05`);
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

					if (!attribute && attributeDataSource.linkage.isAnalyticalUnitName) {
						attribute = {
							...pantherData.fuoreAuNameAttribute,
							linkage: {
								attributeFidColumn: attributeDataSource.linkage.attributeFidColumn
							}
						};
						period = {key: null};
					}

					if (!scope || !layerTemplate || !period || !attribute) {
						throw new Error(`unable to create internal data structure - #ERR06`);
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
				_.each(pantherData, async (value, property) => {
					switch (property) {
						case `fuoreAuNameAttribute`:
							await this._pgPermission.addGroup(guestGroupKey, `attribute`, value.key, `GET`);
							break;
						case `scopes`:
							for (let scope of value) {
								await this._pgPermission.addGroup(guestGroupKey, `scope`, scope.key, `GET`);
							}
							break;
						case `attributes`:
							for (let attribute of value) {
								await this._pgPermission.addGroup(guestGroupKey, `attribute`, attribute.key, `GET`);
							}
							break;
						case `periods`:
							for (let period of value) {
								await this._pgPermission.addGroup(guestGroupKey, `period`, period.key, `GET`);
							}
							break;
						case `tags`:
							for (let tag of value) {
								await this._pgPermission.addGroup(guestGroupKey, `tag`, tag.key, `GET`);
							}
							break;
						case `layerTemplates`:
							for (let layerTemplate of value) {
								await this._pgPermission.addGroup(guestGroupKey, `layerTemplate`, layerTemplate.key, `GET`);
							}
							break;
						case `views`:
							for (let view of value) {
								await this._pgPermission.addGroup(guestGroupKey, `view`, view.key, `GET`);
							}
							break;
						case `esponFuoreIndicators`:
							for (let esponFuoreIndicator of value) {
								await this._pgPermission.addGroup(guestGroupKey, `esponFuoreIndicator`, esponFuoreIndicator.key, `GET`);
							}
							break;
						case `layerTrees`:
							for (let layerTree of value) {
								await this._pgPermission.addGroup(guestGroupKey, `layerTree`, layerTree.key, `GET`);
							}
							break;
					}
				})
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
				return this.createPantherAttributesFromFuoreAttributes(attributes, user, pantherData)
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
				return this.createPantherLayerTemplatesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTemplates) => {
						pantherData.layerTemplates = pantherLayerTemplates;
					});
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
				return this.createPantherLayerTreesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTrees) => {
						pantherData.layerTrees = pantherLayerTrees;
					})
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