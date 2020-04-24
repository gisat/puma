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

const PgPeriods = require(`../metadata/PgPeriods`);

const PgPermission = require(`../security/PgPermissions`);
const Permission = require(`../security/Permission`);

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

	async recreateAnalyticalUnitTable(analyticalUnitMetadata, unzippedFs) {
		await this.deleteAnalyticalUnitTable(analyticalUnitMetadata);
		await this.createAnalyticalUnitTable(analyticalUnitMetadata, unzippedFs);
	}

	async deleteAnalyticalUnitTable(analyticalUnitMetadata) {
		let analyticalUnitTableName = `fuore-au_${analyticalUnitMetadata.uuid}`;
		await this._pgPool.query(`DROP TABLE IF EXISTS "public"."${analyticalUnitTableName}"`);
	}

	async createAnalyticalUnitTable(analyticalUnitMetadata, unzippedFs) {
		let analyticalUnitTableName = `fuore-au_${analyticalUnitMetadata.uuid}`;
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
		} else if (unzippedFs.contents().includes(analyticalUnitMetadata.name) && isTableCreated && analyticalUnitMetadata.update) {
			await this.recreateAnalyticalUnitTable(analyticalUnitMetadata, unzippedFs);
		} else if (unzippedFs.contents().includes(analyticalUnitMetadata.name) && isTableCreated && !analyticalUnitMetadata.update) {
			throw new Error(`analytical unit table ${analyticalUnitMetadata.name} already exists`);
		}

	}

	async isAnalyticalUnitsTableExisting(analyticalUnitMetadata) {
		let analyticalUnitTableName = `fuore-au_${analyticalUnitMetadata.uuid}`;
		return await this._pgPool
			.query(`SELECT count(*) FROM pg_tables WHERE "schemaname" = 'public' AND "tablename" = '${analyticalUnitTableName}';`)
			.then((pgResults) => {
				return !!(Number(pgResults.rows[0].count));
			});
	}

	async isAttributeDataTableExisting(attributeMetadata) {
		let attributeDataTableName = `fuore-attr_${attributeMetadata.uuid}_${attributeMetadata.analytical_unit_id}`;
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
					let analyticalUnits = this.prepareForImport(
						JSON.parse(
							unzippedFs.read('analytical_units.json', 'text')
						),
						true
					);

					analyticalUnits = _.filter(analyticalUnits, (analyticalUnit) => {
						let relatedAnalyticalUnits = _.filter(analyticalUnits, (relatedAnalyticalUnit) => {
							return relatedAnalyticalUnit.relation_key === analyticalUnit.relation_key
								&& relatedAnalyticalUnit.delete;
						})

						return !relatedAnalyticalUnits.length;
					})

					let analyticalUnitIds = [];
					let analyticalUnitUuids = [];

					for (let analyticalUnitMetadata of analyticalUnits) {
						if (!analyticalUnitMetadata.hasOwnProperty(`id`)) {
							throw new Error(`missing id property in analytical unit metadata`);
						}
						if (!analyticalUnitMetadata.hasOwnProperty(`uuid`)) {
							analyticalUnitMetadata.uuid = uuidv4();
						}

						if (analyticalUnitIds.includes(analyticalUnitMetadata.id)) {
							throw new Error(`Analytical units has non-unique ids`);
						}

						if (analyticalUnitUuids.includes(analyticalUnitMetadata.uuid)) {
							throw new Error(`Analytical units has non-unique uuids`);
						}

						analyticalUnitIds.push(analyticalUnitMetadata.id);
						analyticalUnitUuids.push(analyticalUnitMetadata.uuid);
					}

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

						if (!analyticalUnitMetadata.hasOwnProperty(`country_code_column`)) {
							throw new Error(`missing country_code_column property in analytical unit metadata`);
						}

						if (!analyticalUnitMetadata.hasOwnProperty(`description`)) {
							throw new Error(`missing description property in analytical unit metadata`);
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

		let attributeDataFileName = `${attributeMetadata.table_name}.json`;

		if (!isTableCreated && unzippedFs.contents().includes(attributeDataFileName)) {
			await this.createAttributeDataTable(attributeMetadata, unzippedFs);
		} else if (attributeMetadata.update) {
			await this.recreateAttributeDataTable(attributeMetadata, unzippedFs);
		} else {
			throw new Error(`Attribute data table ${attributeDataFileName} already exists`);
		}
	}

	async createAttributeDataTable(attributeMetadata, unzippedFs) {
		let attributeDataTableName = `fuore-attr_${attributeMetadata.uuid}_${attributeMetadata.analytical_unit_id}`;
		let attributeData = JSON.parse(unzippedFs.read(`${attributeMetadata.table_name}.json`, 'text'));

		let attributeMetadataYearsParts = attributeMetadata.years.split(`-`);
		let attributeMetadataStartYear = attributeMetadataYearsParts[0];
		let attributeMetadataEndYear = attributeMetadataYearsParts[1] || attributeMetadataYearsParts[0];

		let attributeMetadataYears = _.map(_.range(Number(attributeMetadataStartYear), Number(attributeMetadataEndYear) + 1), (yearNumber) => {
			return String(yearNumber);
		});

		let yearRegExp = RegExp('^[0-9]{4}$');

		let tableColumns = {};
		for (let attributeDataObject of attributeData) {
			_.each(attributeDataObject, (value, property) => {
				if (!tableColumns.hasOwnProperty(property) || !tableColumns[property]) {
					if (!yearRegExp.test(property) || attributeMetadataYears.includes(property)) {
						if (_.isNull(value)) {
						} else if (_.isNumber(value)) {
							tableColumns[property] = `NUMERIC`;
						} else {
							tableColumns[property] = `TEXT`;
						}
					}
				}
			});
		}

		let sql = [];

		sql.push(`BEGIN;`);

		sql.push(`CREATE TABLE IF NOT EXISTS "public"."${attributeDataTableName}" (`);

		sql.push(`auto_fid SERIAL PRIMARY KEY,`);

		let columnDefinitions = [];
		_.each(tableColumns, (type, column) => {
			let unique = ``;
			if (column === attributeMetadata.fid_column) {
				unique = ` UNIQUE`
			}
			columnDefinitions.push(`"${column}" ${type}${unique}`);
		});

		sql.push(columnDefinitions.join(`,\n`));

		sql.push(`);`);

		for (let attributeDataObject of attributeData) {
			let columnNames = [];
			let values = [];

			_.each(tableColumns, (type, columnName) => {
				columnNames.push(columnName);
				// todo remove when data will contains correct no data values
				if (yearRegExp.test(columnName) && attributeDataObject[columnName] === 0) {
					values.push(`NULL`);
				} else if (attributeDataObject[columnName] === null) {
					values.push(`NULL`);
				} else {
					if (type === `TEXT`) {
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

	async deleteAttributeDataTable(attributeMetadata) {
		let attributeDataTableName = `fuore-attr_${attributeMetadata.uuid}_${attributeMetadata.analytical_unit_id}`;
		await this._pgPool.query(`DROP TABLE IF EXISTS "public"."${attributeDataTableName}"`);
	}

	async recreateAttributeDataTable(attributeMetadata, unzippedFs) {
		await this.deleteAttributeDataTable(attributeMetadata);
		await this.createAttributeDataTable(attributeMetadata, unzippedFs);
	}

	ensureAttributesData(unzippedFs) {
		return Promise.resolve()
			.then(async () => {
				if (unzippedFs.contents().includes('attributes.json')) {
					let attributes = this.prepareForImport(
						JSON.parse(
							unzippedFs.read('attributes.json', 'text')
						),
						true
					);

					attributes = _.filter(attributes, (attribute) => {
						let relatedAttributes = _.filter(attributes, (relatedAttribute) => {
							return relatedAttribute.uuid === attribute.uuid
								&& relatedAttribute.delete;
						})
						return !relatedAttributes.length;
					});

					for (let attributeMetadata of attributes) {
						if (!attributeMetadata.hasOwnProperty(`uuid`)) {
							throw new Error(`Some of the attributes has no uuid property set!`);
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
						if (!attributeMetadata.hasOwnProperty(`sub_category`)) {
							throw new Error(`missing sub_category property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`description`)) {
							throw new Error(`missing description property in metadata of attribute ${attributeMetadata.name}`);
						}

						await this.ensureAttributeData(attributeMetadata, unzippedFs);
					}

					return attributes;
				} else {
					throw new Error(`missing attributes.json`);
				}
			})
	}

	async updateMetadata(group, data, user) {
		return this._pgMetadataCrud.update({
				[group]: data
			},
			user,
			{}
		).then((result) => {
			return result[group];
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

					return this._pgMetadataCrud.create({[group]: [metadataObject]}, user, null, true)
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
					return this._pgSpecificCrud.create({[group]: [{data: data}]}, user, null, true)
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
					return this._pgDataSourcesCrud.create({[group]: [{data: data}]}, user, null, true)
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
					return this._pgViewsCrud.create({[group]: [{data: data}]}, user, null, true)
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
					return this._pgApplicationsCrud.create({[group]: [{data: data}]}, user, null, true)
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
					return this._pgRelationsCrud.create({[group]: [{data: data}]}, user, null, true)
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

	createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherScopesToUpdateOrCreate = [];

				let analyticalUnitsLevel2 = _.filter(analyticalUnits, (analyticalUnit) => {
					return analyticalUnit.au_level === 2;
				});

				for (let analyticalUnitLevel2 of analyticalUnitsLevel2) {
					let scopeNameInternal = `fuore-au_${analyticalUnitLevel2.uuid}-do-not-edit`;

					let analyticalUnitLevel1 = _.find(analyticalUnits, (analyticalUnitLevel1) => {
						return analyticalUnitLevel1.au_level === 1 && analyticalUnitLevel1.relation_key === analyticalUnitLevel2.relation_key;
					});

					let layerTemplateLevel1 = _.find(pantherData.layerTemplates, (layerTemplateLevel1) => {
						return layerTemplateLevel1.data.nameInternal === `fuore-au_${analyticalUnitLevel1.uuid}-do-not-edit`;
					});

					let layerTemplateLevel2 = _.find(pantherData.layerTemplates, (layerTemplateLevel2) => {
						return layerTemplateLevel2.data.nameInternal === `fuore-au_${analyticalUnitLevel2.uuid}-do-not-edit`;
					});

					let viewLevel1 = _.find(pantherData.views, (viewLevel1) => {
						return viewLevel1.data.nameInternal === `fuore-base-au_${analyticalUnitLevel1.uuid}-do-not-edit`;
					});

					let viewLevel2 = _.find(pantherData.views, (viewLevel2) => {
						return viewLevel2.data.nameInternal === `fuore-base-au_${analyticalUnitLevel2.uuid}-do-not-edit`;
					});

					pantherScopesToUpdateOrCreate.push(
						{
							key: analyticalUnitLevel2.uuid,
							data: {
								nameInternal: scopeNameInternal,
								nameDisplay: analyticalUnitLevel2.type_of_region,
								applicationKey: esponFuoreApplicationKey,
								description: analyticalUnitLevel2.description,
								configuration: {
									areaNameAttributeKey: pantherData.fuoreAuNameAttribute.key,
									countryCodeAttributeKey: pantherData.fuoreAuCountryCodeAttribute.key,
									regionType: analyticalUnitLevel2.region_type,
									auLevel1LayerTemplateKey: layerTemplateLevel1.key,
									auLevel2LayerTemplateKey: layerTemplateLevel2.key,
									auLevel1ViewKey: viewLevel1.key,
									auLevel2ViewKey: viewLevel2.key,
									baseOrder: analyticalUnitLevel2.order
								}
							}
						}
					);
				}

				return await this.updateMetadata(
					`scopes`,
					pantherScopesToUpdateOrCreate,
					user
				);
			});
	}

	getCommonPeriods(attributes, analyticalUnits) {
		let indicatorsPerPeriodPerScope = {}

		_.each(analyticalUnits, (analyticalUnit) => {
			indicatorsPerPeriodPerScope[analyticalUnit.relation_key] = indicatorsPerPeriodPerScope[analyticalUnit.relation_key] || {
				periods: {},
				indicators: []
			}
			let attributesForAnalyticalUnit = _.filter(attributes, (attribute) => {
				return attribute.analytical_unit === analyticalUnit.table_name;
			});

			_.each(attributesForAnalyticalUnit, (attribute) => {
				let periodsParts = attribute.years.split(`-`);
				let periodStart = periodsParts[0];
				let periodEnd = periodsParts[1];

				let periodRange = _.range(Number(periodStart), Number(periodEnd) + 1);

				_.each(periodRange, (period) => {
					if (!indicatorsPerPeriodPerScope[analyticalUnit.relation_key].periods.hasOwnProperty(period)) {
						indicatorsPerPeriodPerScope[analyticalUnit.relation_key].periods[period] = [attribute.uuid];
					} else {
						indicatorsPerPeriodPerScope[analyticalUnit.relation_key].periods[period].push(attribute.uuid);
					}
				})

				indicatorsPerPeriodPerScope[analyticalUnit.relation_key].indicators.push(attribute.uuid);
			});

		});

		let indicatorCountsPerPeriodPerScope = {}

		_.each(indicatorsPerPeriodPerScope, (indicatorsPerPeriod, scope) => {
			indicatorCountsPerPeriodPerScope[scope] = indicatorCountsPerPeriodPerScope[scope] || [];
			_.each(indicatorsPerPeriod.periods, (indicators, period) => {
					indicatorCountsPerPeriodPerScope[scope].push(
						{
							period: Number(period),
							percentage: _.uniq(indicators).length / (_.uniq(indicatorsPerPeriod.indicators).length / 100)
						})
				}
			);
			indicatorCountsPerPeriodPerScope[scope] = _.orderBy(indicatorCountsPerPeriodPerScope[scope], [`percentage`, `period`], [`desc`, `desc`]);
		});

		return indicatorCountsPerPeriodPerScope;
	}

	createPantherViewsFromFuoreAnalyticalUnits(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherViews = await this._pgViewsCrud.get(
					`views`,
					{
						filter: {
							applicationKey: esponFuoreApplicationKey
						},
						unlimited: true
					},
					user
				).then((getResults) => {
					return getResults.data.views;
				});

				let commonPeriods = this.getCommonPeriods(attributes, analyticalUnits);

				let pantherViewsToCreateOrUpdate = [];
				for (let analyticalUnit of analyticalUnits) {
					let state = _.cloneDeep(baseViewState);
					let existingPantherView = _.find(pantherViews, (pantherView) => {
						return pantherView.data.nameInternal === `fuore-base-au_${analyticalUnit.uuid}-do-not-edit`;
					});

					let pantherViewKey = existingPantherView ? existingPantherView.key : uuidv4();

					let pantherLayerTemplateNameInternal = `fuore-au_${analyticalUnit.uuid}-do-not-edit`;
					let layerTemplate = _.find(pantherData.layerTemplates, (pantherLayerTemplate) => {
						return pantherLayerTemplate.data.nameInternal === pantherLayerTemplateNameInternal;
					});

					let attributesForAnalytiticalUnit = _.filter(attributes, (attribute) => {
						return attribute.analytical_unit_id === analyticalUnit.id;
					});

					if (!layerTemplate || !attributesForAnalytiticalUnit.length) {
						throw new Error(`unable to create internal data structure - #ERR01`);
					}

					let activeYearValue = commonPeriods[analyticalUnit.relation_key][0].period;
					let activeYearPeriodKey = _.find(pantherData.periods, (pantherPeriod) => {
						return pantherPeriod.data.nameInternal === `fuore-${String(activeYearValue)}-do-not-edit`;
					}).key;

					let intervalPeriods = _.map(_.filter(commonPeriods[analyticalUnit.relation_key], (commonPeriod) => {
						return commonPeriod.percentage === commonPeriods[analyticalUnit.relation_key][0].percentage;
					}), `period`).sort();

					let intervalYearValues = [
						_.nth(intervalPeriods, 0),
						_.nth(intervalPeriods, (intervalPeriods.length / 2) - 1),
						_.nth(intervalPeriods, intervalPeriods.length - 1)
					];

					let intervalYearPeriodKeys = _.map(intervalYearValues, (intervalYearValue) => {
						return _.find(pantherData.periods, (pantherPeriod) => {
							return pantherPeriod.data.nameInternal === `fuore-${String(intervalYearValue)}-do-not-edit`;
						}).key;
					});

					state.maps.maps["c4edaf02-f88a-47c8-a29e-3f53d3d544e2"].data.layers[0].layerTemplate = layerTemplate.key;
					state.maps.maps["c4edaf02-f88a-47c8-a29e-3f53d3d544e2"].data.metadataModifiers.period = activeYearPeriodKey;
					state.charts.charts.columnChart1.data.layerTemplate = layerTemplate.key;
					state.charts.charts.progressChart.data.periods = intervalYearPeriodKeys;
					state.charts.charts.progressChart.data.layerTemplate = layerTemplate.key;
					state.periods.activeKeys = [activeYearPeriodKey];

					pantherViewsToCreateOrUpdate.push(
						{
							key: pantherViewKey,
							data: {
								nameInternal: `fuore-base-au_${analyticalUnit.uuid}-do-not-edit`,
								nameDisplay: `fuore-base-au_${analyticalUnit.uuid}-do-not-edit`,
								applicationKey: esponFuoreApplicationKey,
								state
							}
						}
					);
				}

				return await this._pgViewsCrud.update(
					{
						views: pantherViewsToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.views;
				})
			});
	}

	createPantherLayerTreesForFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherLayerTrees = await this._pgApplicationsCrud.get(
					`layerTrees`,
					{
						filter: {
							nameInternal: {
								like: `fuore-base-au\\_`
							}
						},
						unlimited: true
					},
					user
				).then((getResult) => {
					return getResult.data.layerTrees
				});

				let pantherLayerTreesToCreateOrUpdate = [];
				for (let analyticalUnit of analyticalUnits) {
					let structure = _.cloneDeep(baseLayerTreeStructure);

					let layerTreeNameInternal = `fuore-base-au_${analyticalUnit.uuid}-do-not-edit`;

					let existingPantherLayerTree = _.find(pantherLayerTrees, (pantherLayerTreeObject) => {
						return pantherLayerTreeObject.data.nameInternal === layerTreeNameInternal;
					});

					let layerTemplate = _.find(pantherData.layerTemplates, (pantherLayerTemplateObject) => {
						return pantherLayerTemplateObject.data.nameInternal.includes(`fuore-au_${analyticalUnit.uuid}`);
					});

					if (!layerTemplate) {
						throw new Error(`unable to create internal data structure - #ERR02`);
					}

					structure[0].layers[0].items[0].key = layerTemplate.key;

					pantherLayerTreesToCreateOrUpdate.push(
						{
							key: existingPantherLayerTree ? existingPantherLayerTree.key : uuidv4(),
							data: {
								nameInternal: layerTreeNameInternal,
								structure,
								applicationKey: esponFuoreApplicationKey,
								scopeKey: analyticalUnit.uuid
							}
						}
					)
				}

				return this._pgApplicationsCrud.update(
					{
						layerTrees: pantherLayerTreesToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.layerTrees;
				});
			});
	}

	createPantherNameAttributeForFuore(key, user) {
		return Promise.resolve()
			.then(async () => {
				let existingPantherNameAttribute = await this._pgMetadataCrud.get(
					`attributes`,
					{
						filter: {
							key
						}
					},
					user
				).then((getResult) => {
					return getResult.data.attributes[0];
				});

				if (existingPantherNameAttribute) {
					return existingPantherNameAttribute;
				} else {
					return this._pgMetadataCrud.create(
						{
							attributes: [
								{
									key,
									data: {
										nameInternal: `fuore_au_name`,
										nameDisplay: `fuore_au_name`,
										applicationKey: esponFuoreApplicationKey
									}
								}
							]
						},
						user,
						{}
					).then(([data, errors]) => {
						return data.attributes[0];
					})
				}
			})
	}

	createPantherCountryCodeAttributeForFuore(key, user) {
		return Promise.resolve()
			.then(async () => {
				let existingPantherNameAttribute = await this._pgMetadataCrud.get(
					`attributes`,
					{
						filter: {
							key
						}
					},
					user
				).then((getResult) => {
					return getResult.data.attributes[0];
				});

				if (existingPantherNameAttribute) {
					return existingPantherNameAttribute;
				} else {
					return this._pgMetadataCrud.create(
						{
							attributes: [
								{
									key,
									data: {
										nameInternal: `fuore_au_country_code`,
										nameDisplay: `fuore_au_country_code`,
										applicationKey: esponFuoreApplicationKey
									}
								}
							]
						},
						user,
						{}
					).then(([data, errors]) => {
						return data.attributes[0];
					})
				}
			})
	}

	createPantherCategoryTagForFuore(pantherData, user) {
		let key = pantherData.fuoreConfiguration.data.data.categoryTagKey;
		return Promise.resolve()
			.then(async () => {
				let existingPantherTag = await this._pgMetadataCrud.get(
					`tags`,
					{
						filter: {
							key
						}
					},
					user
				).then((getResult) => {
					return getResult.data.tags[0];
				});

				if (existingPantherTag) {
					return existingPantherTag;
				} else {
					return this._pgMetadataCrud.create(
						{
							tags: [
								{
									key,
									data: {
										nameInternal: `fuore_category`,
										nameDisplay: `fuore_category`,
										applicationKey: esponFuoreApplicationKey
									}
								}
							]
						},
						user,
						{}
					).then(([data, errors]) => {
						return data.tags[0];
					})
				}
			});
	}

	createPantherSubCategoryTagForFuore(pantherData, user) {
		let key = pantherData.fuoreConfiguration.data.data.subCategoryTagKey;
		return Promise.resolve()
			.then(async () => {
				let existingPantherTag = await this._pgMetadataCrud.get(
					`tags`,
					{
						filter: {
							key
						}
					},
					user
				).then((getResult) => {
					return getResult.data.tags[0];
				});

				if (existingPantherTag) {
					return existingPantherTag;
				} else {
					return this._pgMetadataCrud.create(
						{
							tags: [
								{
									key,
									data: {
										nameInternal: `fuore_sub_category`,
										nameDisplay: `fuore_sub_category`,
										applicationKey: esponFuoreApplicationKey
									}
								}
							]
						},
						user,
						{}
					).then(([data, errors]) => {
						return data.tags[0];
					})
				}
			});
	}

	createPantherAuLevel1TagForFuore(pantherData, user) {
		let key = pantherData.fuoreConfiguration.data.data.auLevel1TagKey;
		return Promise.resolve()
			.then(async () => {
				let existingPantherTag = await this._pgMetadataCrud.get(
					`tags`,
					{
						filter: {
							key
						}
					},
					user
				).then((getResult) => {
					return getResult.data.tags[0];
				});

				if (existingPantherTag) {
					return existingPantherTag;
				} else {
					return this._pgMetadataCrud.create(
						{
							tags: [
								{
									key,
									data: {
										nameInternal: `fuore_au_leve1`,
										nameDisplay: `fuore_au_leve1`,
										applicationKey: esponFuoreApplicationKey
									}
								}
							]
						},
						user,
						{}
					).then(([data, errors]) => {
						return data.tags[0];
					})
				}
			});
	}

	createPantherAuLevel2TagForFuore(pantherData, user) {
		let key = pantherData.fuoreConfiguration.data.data.auLevel2TagKey;
		return Promise.resolve()
			.then(async () => {
				let existingPantherTag = await this._pgMetadataCrud.get(
					`tags`,
					{
						filter: {
							key
						}
					},
					user
				).then((getResult) => {
					return getResult.data.tags[0];
				});

				if (existingPantherTag) {
					return existingPantherTag;
				} else {
					return this._pgMetadataCrud.create(
						{
							tags: [
								{
									key,
									data: {
										nameInternal: `fuore_au_leve2`,
										nameDisplay: `fuore_au_leve2`,
										applicationKey: esponFuoreApplicationKey
									}
								}
							]
						},
						user,
						{}
					).then(([data, errors]) => {
						return data.tags[0];
					})
				}
			});
	}

	createPantherAttributesFromFuoreAttributes(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributesToUpdateOrCreate = [];
				for (let attribute of attributes) {
					let analyticalUnit = _.find(analyticalUnits, (analyticalUnit) => {
						return analyticalUnit.id === attribute.analytical_unit_id;
					});

					if (!analyticalUnit) {
						throw new Error(`unable to create internal data structure - #ERR07`);
					}

					let preparedPantherAttribute = _.find(pantherAttributesToUpdateOrCreate, (preparedPantherAttribute) => {
						return preparedPantherAttribute.key === attribute.uuid;
					});

					if (!preparedPantherAttribute) {
						pantherAttributesToUpdateOrCreate.push({
							key: attribute.uuid,
							data: {
								nameInternal: `fuore-au_${analyticalUnit.uuid}-attr_${attribute.uuid}-do-not-edit`,
								nameDisplay: attribute.name,
								description: attribute.description,
								color: attribute.color || null,
								applicationKey: esponFuoreApplicationKey,
								unit: attribute.unit,
								valueType: attribute.value_type
							}
						});
					}
				}

				return await this.updateMetadata(
					`attributes`,
					pantherAttributesToUpdateOrCreate,
					user
				);
			});
	}

	createPantherPeriodsFromFuoreAttributes(attributes, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let fuorePeriods = await this._pgMetadataCrud.get(
					`periods`,
					{
						filter: {
							applicationKey: esponFuoreApplicationKey
						},
						unlimited: true
					},
					user
				).then((getResults) => {
					return getResults.data.periods;
				});

				let fuorePeriodsInternalNames = _.map(fuorePeriods, (periodObject) => {
					return periodObject.data.nameInternal;
				});

				let periodsToCreate = [];
				for (let attribute of attributes) {
					let periodParts = attribute.years.split(`-`);
					let periodStart = Number(periodParts[0]);
					let periodEnd = Number(periodParts[1] || periodStart);

					let periods = _.range(periodStart, periodEnd + 1);

					for (let period of periods) {
						let nameInternal = `fuore-${String(period)}-do-not-edit`;
						if (!fuorePeriodsInternalNames.includes(nameInternal)) {
							fuorePeriodsInternalNames.push(nameInternal);
							periodsToCreate.push({
								data: {
									nameInternal,
									nameDisplay: String(period),
									period: String(period),
									applicationKey: esponFuoreApplicationKey
								}
							})
						}
					}
				}

				let createdPeriods = [];
				if (periodsToCreate.length) {
					await this._pgMetadataCrud.create(
						{
							periods: periodsToCreate
						},
						user,
						{}
					).then(([data, errors]) => {
						createdPeriods = data.periods;
					})
				}

				return _.concat(fuorePeriods, createdPeriods);
			});
	}

	createPantherTagsFromFuoreAnalyticalUnits(analyticalUnits, user) {
		return Promise.resolve()
			.then(async () => {
				let existingPantherTags = await this._pgMetadataCrud.get(
					`tags`,
					{
						filter: {
							applicationKey: esponFuoreApplicationKey
						},
						unlimited: true
					},
					user
				).then((getResults) => {
					return getResults.data.tags;
				});

				let fuoreTagsToCreateOrUpdate = [];
				for (let analyticalUnit of analyticalUnits) {
					let pantherAuRelationTagInternalName = `fuore-au-relation-${analyticalUnit.relationKey}-do-not-edit`;

					let preparedAuRelationTagForUpdateOrCreate = _.find(fuoreTagsToCreateOrUpdate, (preparedPantherTag) => {
						return preparedPantherTag.key === analyticalUnit.relationKey;
					});
					let existingPantherAuRelationTagObject = _.find(existingPantherTags, (pantherTagObject) => {
						return existingPantherTags.key === analyticalUnit.relationKey;
					});

					let tagKey = (preparedAuRelationTagForUpdateOrCreate && preparedAuRelationTagForUpdateOrCreate.key) || (existingPantherAuRelationTagObject && existingPantherAuRelationTagObject.key || analyticalUnit.relationKey);
					if (!preparedAuRelationTagForUpdateOrCreate) {
						fuoreTagsToCreateOrUpdate.push({
							key: tagKey,
							data: {
								nameInternal: pantherAuRelationTagInternalName,
								nameDisplay: pantherAuRelationTagInternalName,
								applicationKey: esponFuoreApplicationKey
							}
						});
					}
				}

				return this._pgMetadataCrud.update(
					{
						tags: fuoreTagsToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.tags;
				});
			});
	}

	createPantherTagsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let existingPantherTags = await this._pgMetadataCrud.get(
					`tags`,
					{
						filter: {
							applicationKey: esponFuoreApplicationKey
						},
						unlimited: true
					},
					user
				).then((getResults) => {
					return getResults.data.tags;
				});

				let analyticalUnitsLevel2 = _.filter(analyticalUnits, (analyticalUnit) => {
					return analyticalUnit.au_level === 2;
				});

				let analyticalUnitNamesLeve2 = _.map(analyticalUnitsLevel2, `table_name`);

				let attributesLevel2 = _.filter(attributes, (attributeLevel2) => {
					return analyticalUnitNamesLeve2.includes(attributeLevel2.analytical_unit);
				});

				let fuoreTagsToCreateOrUpdate = [];
				for (let attribute of attributesLevel2) {
					let attributeAnalyticalUnit = _.find(analyticalUnitsLevel2, (attributeAnalyticalUnit) => {
						return attributeAnalyticalUnit.table_name === attribute.analytical_unit;
					})

					let pantherCategoryTagInternalName = `fuore-category-${attribute.category}-scope_${attributeAnalyticalUnit.uuid}-do-not-edit`;

					let preparedCategoryTagForUpdateOrCreate = _.find(fuoreTagsToCreateOrUpdate, (preparedPantherTag) => {
						return preparedPantherTag.data.nameInternal === pantherCategoryTagInternalName;
					});
					let existingPantherCategoryTagObject = _.find(existingPantherTags, (pantherTagObject) => {
						return pantherTagObject.data.nameInternal === pantherCategoryTagInternalName;
					});

					let categoryKey = (preparedCategoryTagForUpdateOrCreate && preparedCategoryTagForUpdateOrCreate.key) || (existingPantherCategoryTagObject && existingPantherCategoryTagObject.key || uuidv4());
					if (!preparedCategoryTagForUpdateOrCreate) {
						fuoreTagsToCreateOrUpdate.push({
							key: categoryKey,
							data: {
								nameInternal: pantherCategoryTagInternalName,
								nameDisplay: attribute.category,
								applicationKey: esponFuoreApplicationKey,
								tagKeys: [pantherData.fuoreCategoryTag.key],
								scopeKey: attributeAnalyticalUnit.uuid
							}
						});
					}

					let pantherSubCategoryTagInternalName = `fuore-subcategory-${attribute.sub_category}-scope_${attributeAnalyticalUnit.uuid}-do-not-edit`;
					let isPreparedSubCategoryTagForUpdateOrCreate = !!(_.find(fuoreTagsToCreateOrUpdate, (preparedPantherTag) => {
						return preparedPantherTag.data.nameInternal === pantherSubCategoryTagInternalName
					}));
					let existingPantherSubCategoryTagObject = _.find(existingPantherTags, (pantherTagObject) => {
						return pantherTagObject.data.nameInternal === pantherSubCategoryTagInternalName;
					});

					if (!isPreparedSubCategoryTagForUpdateOrCreate) {
						fuoreTagsToCreateOrUpdate.push({
							key: existingPantherSubCategoryTagObject ? existingPantherSubCategoryTagObject.key : uuidv4(),
							data: {
								nameInternal: pantherSubCategoryTagInternalName,
								nameDisplay: attribute.sub_category,
								applicationKey: esponFuoreApplicationKey,
								tagKeys: [pantherData.fuoreSubCategoryTag.key, categoryKey],
								scopeKey: attributeAnalyticalUnit.uuid
							}
						})
					}
				}

				return this._pgMetadataCrud.update(
					{
						tags: fuoreTagsToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.tags;
				});
			});
	}

	createPantherEsponFuoreIndicatorsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherEsponFuoreIndicators = await this._pgSpecificCrud.get(
					`esponFuoreIndicators`,
					{
						unlimited: true
					},
					user
				).then((getResult) => {
					return getResult.data.esponFuoreIndicators;
				});

				let esponFuoreIndicatorsToCreateOrUpdate = [];
				for (let attribute of attributes) {
					let analyticalUnit = _.find(analyticalUnits, (analyticalUnitObject) => {
						return analyticalUnitObject.id === attribute.analytical_unit_id;
					});

					let analyticalUnitLevel1 = _.find(analyticalUnits, (analyticalUnitLevel1) => {
						return analyticalUnitLevel1.au_level === 1
							&& analyticalUnitLevel1.relation_key === analyticalUnit.relation_key
					});

					let analyticalUnitLevel2 = _.find(analyticalUnits, (analyticalUnitLevel2) => {
						return analyticalUnitLevel2.au_level === 2
							&& analyticalUnitLevel2.relation_key === analyticalUnit.relation_key
					});

					let sameAttributes = _.filter(attributes, (sameAttribute) => {
						return sameAttribute.uuid === attribute.uuid;
					});

					let dataL1 = !!(_.find(sameAttributes, (sameAttribute) => {
						return sameAttribute.analytical_unit === analyticalUnitLevel1.table_name;
					}))

					let dataL2 = !!(_.find(sameAttributes, (sameAttribute) => {
						return sameAttribute.analytical_unit === analyticalUnitLevel2.table_name;
					}))

					let categoryPantherTagInternalName = `fuore-category-${attribute.category}-scope_${analyticalUnitLevel2.uuid}-do-not-edit`;
					let subCategoryPantherTagInternalName = `fuore-subcategory-${attribute.sub_category}-scope_${analyticalUnitLevel2.uuid}-do-not-edit`;

					let pantherTags = _.filter(pantherData.tags, (pantherTagObject) => {
						return pantherTagObject.data.nameInternal === categoryPantherTagInternalName || pantherTagObject.data.nameInternal === subCategoryPantherTagInternalName;
					});

					let pantherTagKeys = _.map(pantherTags, (pantherTagObject) => {
						return pantherTagObject.key;
					});

					let pantherView = _.find(pantherData.views, (pantherView) => {
						return pantherView.data.nameInternal === `fuore-base-au_${analyticalUnit.uuid}-do-not-edit`;
					});

					if (!analyticalUnit || !pantherTagKeys.length || !pantherView || !analyticalUnitLevel2) {
						console.log(categoryPantherTagInternalName, subCategoryPantherTagInternalName);
						throw new Error(`unable to create internal data structure - #ERR04`);
					}

					let fuoreIndicatorNameInternal = `fuore-scope_${analyticalUnitLevel2.uuid}-attr_${attribute.uuid}-do-not-edit`;

					let existingFuoreIndicator = _.find(pantherEsponFuoreIndicators, (pantherEsponFuoreIndicatorObject) => {
						return pantherEsponFuoreIndicatorObject.data.nameInternal === fuoreIndicatorNameInternal;
					});

					let preparedFuoreIndicator = _.find(esponFuoreIndicatorsToCreateOrUpdate, (preparedFuoreIndicator) => {
						return preparedFuoreIndicator.data.nameInternal === fuoreIndicatorNameInternal;
					});

					if (!preparedFuoreIndicator) {
						let esponFuoreIndicatorKey = existingFuoreIndicator ? existingFuoreIndicator.key : uuidv4();

						esponFuoreIndicatorsToCreateOrUpdate.push(
							{
								key: esponFuoreIndicatorKey,
								data: {
									nameInternal: fuoreIndicatorNameInternal,
									nameDisplay: attribute.name,
									type: attribute.value_type,
									description: attribute.description,
									attributeKey: attribute.uuid,
									scopeKey: analyticalUnitLevel2.uuid,
									tagKeys: pantherTagKeys,
									viewKey: pantherView.key,
									twoSideScale: attribute.two_side_scale || false,
									other: {
										dataL1,
										dataL2
									}
								}
							}
						);
					}
				}

				return this._pgSpecificCrud.update(
					{
						esponFuoreIndicators: esponFuoreIndicatorsToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.esponFuoreIndicators
				})
			});
	}

	createPantherSpatialDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherSpatialDataSources = [];

				let spatialDataSourcesToCreateOrUpdate = [];

				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au_${analyticalUnit.uuid}`;
					let existingSpatialDataSource = _.find(pantherSpatialDataSources, (pantherSpatialDataSourceObject) => {
						return pantherSpatialDataSourceObject.data.tableName === analyticalUnitTableName;
					});

					let spatialDataSourceKey = existingSpatialDataSource ? existingSpatialDataSource.key : uuidv4();

					spatialDataSourcesToCreateOrUpdate.push(
						{
							key: spatialDataSourceKey,
							data: {
								tableName: analyticalUnitTableName,
								type: `vector`
							}
						}
					)
				}

				return this._pgDataSourcesCrud.update(
					{
						spatial: spatialDataSourcesToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.spatial
				});
			});
	}

	createPantherNameAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user, nameAttributeKey) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributeDataSources = await this._pgDataSourcesCrud.get(
					`attribute`,
					{
						filter: {
							tableName: {
								like: "fuore-au\\_"
							}
						},
						unlimited: true
					},
					user
				).then((getResult) => {
					return getResult.data.attribute
				});

				let pantherAttributeDataSourcesToCreateOrUpdate = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au_${analyticalUnit.uuid}`;
					let nameInternal = `fuore#name#attr_${nameAttributeKey}#au_${analyticalUnit.uuid}`;

					let existingAttributeDataSource = _.find(pantherAttributeDataSources, (pantherAttributeDataSourceObject) => {
						return pantherAttributeDataSourceObject.data.tableName === analyticalUnitTableName && pantherAttributeDataSourceObject.data.columnName === analyticalUnit.name_column;
					});

					let key = existingAttributeDataSource ? existingAttributeDataSource.key : uuidv4();

					pantherAttributeDataSourcesToCreateOrUpdate.push(
						{
							key,
							data: {
								nameInternal,
								tableName: analyticalUnitTableName,
								columnName: analyticalUnit.name_column
							}
						}
					)
				}

				return this._pgDataSourcesCrud.update(
					{
						attribute: pantherAttributeDataSourcesToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.attribute;
				});
			});
	}

	createPantherCountryCodeAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user, countryCodeAttributeKey) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributeDataSources = await this._pgDataSourcesCrud.get(
					`attribute`,
					{
						filter: {
							tableName: {
								like: "fuore-au\\_"
							}
						},
						unlimited: true
					},
					user
				).then((getResult) => {
					return getResult.data.attribute
				});

				let pantherAttributeDataSourcesToCreateOrUpdate = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au_${analyticalUnit.uuid}`;
					let nameInternal = `fuore#country_code#attr_${countryCodeAttributeKey}#au_${analyticalUnit.uuid}`;

					let existingAttributeDataSource = _.find(pantherAttributeDataSources, (pantherAttributeDataSourceObject) => {
						return pantherAttributeDataSourceObject.data.tableName === analyticalUnitTableName && pantherAttributeDataSourceObject.data.columnName === analyticalUnit.country_code_column;
					});

					let key = existingAttributeDataSource ? existingAttributeDataSource.key : uuidv4();

					pantherAttributeDataSourcesToCreateOrUpdate.push(
						{
							key,
							data: {
								nameInternal,
								tableName: analyticalUnitTableName,
								columnName: analyticalUnit.country_code_column
							}
						}
					)
				}

				return this._pgDataSourcesCrud.update(
					{
						attribute: pantherAttributeDataSourcesToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.attribute;
				});
			});
	}

	createPantherAttributeDataSourceFromFuoreAttributes(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {

				let tableNames = _.map(attributes, (attribute) => {
					return `fuore-attr_${attribute.uuid}_${attribute.analytical_unit_id}`;
				});

				let pantherAttributeDataSources = await this._pgDataSourcesCrud.get(
					`attribute`,
					{
						filter: {
							tableName: {
								in: tableNames
							}
						},
						unlimited: true
					},
					user
				).then((getResult) => {
					return getResult.data.attribute;
				});

				let pantherAttributeDataSourcesToCreateOrUpdate = [];
				for (let attributeMetadata of attributes) {
					let yearsParts = attributeMetadata.years.split(`-`);
					let yearStart = Number(yearsParts[0]);
					let yearEnd = Number(yearsParts[1] || yearStart);

					let analyticalUnit = _.find(analyticalUnits, (analyticalUnit) => {
						return analyticalUnit.id === attributeMetadata.analytical_unit_id
					});

					for (let year of _.range(yearStart, yearEnd)) {
						let attributeDataTableName = `fuore-attr_${attributeMetadata.uuid}_${attributeMetadata.analytical_unit_id}`;
						let nameInternal = `fuore#attribute#attr_${attributeMetadata.uuid}#au_${analyticalUnit.uuid}`;
						let columnName = String(year);

						let existingPantherAttributeDataSource = _.find(pantherAttributeDataSources, (pantherAttributeDataSourceObject) => {
							return pantherAttributeDataSourceObject.data.tableName === attributeDataTableName && pantherAttributeDataSourceObject.data.columnName === columnName;
						});

						let key = existingPantherAttributeDataSource ? existingPantherAttributeDataSource.key : uuidv4();

						pantherAttributeDataSourcesToCreateOrUpdate.push(
							{
								key,
								data: {
									nameInternal,
									tableName: attributeDataTableName,
									columnName
								}
							}
						)
					}
				}

				return this._pgDataSourcesCrud.update(
					{
						attribute: pantherAttributeDataSourcesToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.attribute;
				})
			});
	}

	createPantherLayerTemplatesForFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
					let pantherLayerTemplates = await this._pgMetadataCrud.get(
						`layerTemplates`,
						{
							filter: {
								applicationKey: esponFuoreApplicationKey
							},
							unlimited: true
						},
						user
					).then((getRestult) => {
						return getRestult.data.layerTemplates;
					});

					let pantherLayerTemplatesToCreateOrUpdate = [];
					for (let analyticalUnit of analyticalUnits) {
						let pantherLayerTemplateNameInternal = `fuore-au_${analyticalUnit.uuid}-do-not-edit`;
						let existingPantherLayerTemplate = _.find(pantherLayerTemplates, (pantherLayerTemplate) => {
							return pantherLayerTemplate.data.nameInternal === pantherLayerTemplateNameInternal;
						});

						let key = existingPantherLayerTemplate ? existingPantherLayerTemplate.key : uuidv4();
						pantherLayerTemplatesToCreateOrUpdate.push(
							{
								key,
								data: {
									nameDisplay: analyticalUnit.type_of_region,
									nameInternal: pantherLayerTemplateNameInternal,
									applicationKey: esponFuoreApplicationKey,
									scopeKey: analyticalUnit.uuid
								}
							}
						)
					}

					return this._pgMetadataCrud.update(
						{
							layerTemplates: pantherLayerTemplatesToCreateOrUpdate
						},
						user,
						{}
					).then((updateResult) => {
						return updateResult.layerTemplates;
					})
				}
			)
	}

	createPantherLayerTemplatesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherLayerTemplates = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au_${analyticalUnit.table_name}`;

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

	createPantherSpatialRelations(analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherSpatialRelationsToCreateOrUpdate = [];
				let existingPantherSpatialRelations = await this._pgRelationsCrud.get(
					`spatial`,
					{
						filter: {
							scopeKey: {
								in: _.map(analyticalUnits, `uuid`)
							}
						},
						unlimited: true
					},
					user
				).then((getResult) => {
					return getResult.data.spatial
				});

				for (let analyticalUnit of analyticalUnits) {
					let pantherSpatialDataSource = _.find(pantherData.spatialDataSources, (pantherSpatialDataSourceObject) => {
						return pantherSpatialDataSourceObject.data.tableName.includes(`au_${analyticalUnit.uuid}`);
					});

					let pantherLayerTemplate = _.find(pantherData.layerTemplates, (pantherLayerTemplateObject) => {
						return pantherLayerTemplateObject.data.nameInternal.includes(`au_${analyticalUnit.uuid}`);
					});

					let baseAnalyticalUnit = _.find(analyticalUnits, (baseAnalyticalUnit) => {
						return baseAnalyticalUnit.au_level === 2
							&& baseAnalyticalUnit.relation_key === analyticalUnit.relation_key;
					});

					let pantherScope = _.find(pantherData.scopes, (pantherScope) => {
						return pantherScope.key === baseAnalyticalUnit.uuid;
					});

					if (!pantherSpatialDataSource || !pantherLayerTemplate || !pantherScope) {
						throw new Error(`unable to create internal data structure - #ERR05`);
					}

					let existingPantherSpatialRelation = _.find(existingPantherSpatialRelations, (pantherSpatialRelationObject) => {
						return pantherSpatialRelationObject.data.scopeKey === pantherScope.key
							&& pantherSpatialRelationObject.data.spatialDataSourceKey === pantherSpatialDataSource.key
							&& pantherSpatialRelationObject.data.layerTemplateKey === pantherLayerTemplate.key
							&& pantherSpatialRelationObject.data.fidColumnName === analyticalUnit.fid_column
					});

					let key = existingPantherSpatialRelation ? existingPantherSpatialRelation.key : uuidv4();

					pantherSpatialRelationsToCreateOrUpdate.push(
						{
							key,
							data: {
								scopeKey: pantherScope.key,
								spatialDataSourceKey: pantherSpatialDataSource.key,
								layerTemplateKey: pantherLayerTemplate.key,
								fidColumnName: analyticalUnit.fid_column
							}
						}
					)

				}

				return this._pgRelationsCrud.update(
					{
						spatial: pantherSpatialRelationsToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.spatial
				});
			});
	}

	createPantherAttributeRelations(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let existingPantherAttributeRelationObjects = await this._pgRelationsCrud.get(
					`attribute`,
					{
						filter: {
							scopeKey: {
								in: _.map(analyticalUnits, `uuid`)
							}
						},
						unlimited: true
					},
					user
				).then((getRequest) => {
					return getRequest.data.attribute
				});

				let pantherAttributeRelationsToCreateOrUpdate = [];
				for (let pantherAttributeDataSourceObject of pantherData.attributeDataSources) {
					let nameInternalParts = pantherAttributeDataSourceObject.data.nameInternal.split(`#`);

					let attributeKey = nameInternalParts[2].split(`_`)[1];
					let analyticalUnitKey = nameInternalParts[3].split(`_`)[1];
					let attributeDataSourceKey = pantherAttributeDataSourceObject.key;

					let analyticalUnit = _.find(analyticalUnits, (analyticalUnit) => {
						return analyticalUnit.uuid === analyticalUnitKey;
					});

					let baseAnalyticalUnit = _.find(analyticalUnits, (baseAnalyticalUnit) => {
						return baseAnalyticalUnit.au_level === 2
							&& baseAnalyticalUnit.relation_key === analyticalUnit.relation_key;
					});

					let scope = _.find(pantherData.scopes, (scope) => {
						return scope.key === baseAnalyticalUnit.uuid;
					});

					let layerTemplateKey;
					if (analyticalUnit.au_level === 1) {
						layerTemplateKey = scope.data.configuration.auLevel1LayerTemplateKey;
					} else if (analyticalUnit.au_level === 2) {
						layerTemplateKey = scope.data.configuration.auLevel2LayerTemplateKey;
					}

					let fidColumnName = analyticalUnit.fid_column;

					let pantherPeriodObject = _.find(pantherData.periods, (pantherPeriodObject) => {
						return pantherPeriodObject.data.nameInternal.includes(pantherAttributeDataSourceObject.data.columnName) && nameInternalParts[1] === `attribute`;
					});

					let periodKey = pantherPeriodObject ? pantherPeriodObject.key : null;

					let existingPantherAttributeRelationObject = _.find(existingPantherAttributeRelationObjects, (existingPantherAttributeRelationObject) => {
						return existingPantherAttributeRelationObject.data.attributeKey === attributeKey
							&& existingPantherAttributeRelationObject.data.scopeKey === scope.key
							&& existingPantherAttributeRelationObject.data.attributeDataSourceKey === attributeDataSourceKey
							&& existingPantherAttributeRelationObject.data.fidColumnName === fidColumnName
							&& existingPantherAttributeRelationObject.data.layerTemplateKey === layerTemplateKey
							&& existingPantherAttributeRelationObject.data.periodKey === periodKey
					});

					let key = existingPantherAttributeRelationObject ? existingPantherAttributeRelationObject.key : uuidv4();

					pantherAttributeRelationsToCreateOrUpdate.push(
						{
							key,
							data: {
								attributeKey,
								scopeKey: scope.key,
								attributeDataSourceKey,
								fidColumnName,
								layerTemplateKey,
								periodKey
							}
						}
					);
				}

				return this._pgRelationsCrud.update(
					{
						attribute: pantherAttributeRelationsToCreateOrUpdate
					},
					user,
					{}
				).then((updateResult) => {
					return updateResult.attribute
				});
			});
	}

	setGuestPermissionsForPantherData(pantherData) {
		return Promise.resolve()
			.then(() => {
				_.each(pantherData, async (value, property) => {
					switch (property) {
						case
						`fuoreAuNameAttribute`
						:
							await this._pgPermission.addGroup(guestGroupKey,
								`attribute`
								, value.key, Permission.READ);
							break;
						case
						`scopes`
						:
							for (let scope of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`scope`
									, scope.key, Permission.READ);
							}
							break;
						case
						`attributes`
						:
							for (let attribute of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`attribute`
									, attribute.key, Permission.READ);
							}
							break;
						case
						`periods`
						:
							for (let period of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`period`
									, period.key, Permission.READ);
							}
							break;
						case
						`tags`
						:
							for (let tag of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`tag`
									, tag.key, Permission.READ);
							}
							break;
						case
						`layerTemplates`
						:
							for (let layerTemplate of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`layerTemplate`
									, layerTemplate.key, Permission.READ);
							}
							break;
						case
						`views`
						:
							for (let view of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`view`
									, view.key, Permission.READ);
							}
							break;
						case
						`esponFuoreIndicators`
						:
							for (let esponFuoreIndicator of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`esponFuoreIndicator`
									, esponFuoreIndicator.key, Permission.READ);
							}
							break;
						case
						`layerTrees`
						:
							for (let layerTree of value) {
								await this._pgPermission.addGroup(guestGroupKey,
									`layerTree`
									, layerTree.key, Permission.READ);
							}
							break;
					}
				})
			});
	}

	ensureFuoreConfiguration(user) {
		let categoryTagKey = "75a06319-ed4d-4750-a139-86619c7b1283";
		let subCategoryTagKey = "5decb5ec-40ea-498a-b92a-b53870f548ec";

		return this._pgApplicationsCrud.get(`configurations`, {
			filter: {
				applicationKey: "esponFuore"
			}
		}, user)
			.then((getResult) => {
				return getResult.data.configurations[0] ? getResult.data.configurations[0].key : uuidv4();
			})
			.then((key) => {
				return this._pgApplicationsCrud.update(
					{
						configurations: [
							{
								key,
								data: {
									applicationKey: "esponFuore",
									data: {
										categoryTagKey,
										subCategoryTagKey
									}
								}
							}
						]
					},
					user,
					{}
				)
			})
			.then((updateResult) => {
				return updateResult.configurations[0];
			})
	}

	updateScopeConfigurationsWithOrderData(attributes, analyticalUnits, user, pantherData) {
		for (let pantherScope of pantherData.scopes) {
			let scopeAnalyticalUnit = _.find(analyticalUnits, (scopeAnalyticalUnit) => {
				return scopeAnalyticalUnit.uuid === pantherScope.key;
			});

			let indicatorOrder = [];
			let categoryOrder = [];
			let subCategoryOrder = [];

			let scopeRelatedAnalyticalUnitRelatedAttributes = _.filter(attributes, (attribute) => {
				return attribute.analytical_unit === scopeAnalyticalUnit.table_name;
			});

			for (let scopeRelatedAttribute of scopeRelatedAnalyticalUnitRelatedAttributes) {
				let fuoreIndicatorNameInternal = `fuore-scope_${pantherScope.key}-attr_${scopeRelatedAttribute.uuid}-do-not-edit`;
				let pantherCategoryTagInternalName = `fuore-category-${scopeRelatedAttribute.category}-scope_${pantherScope.key}-do-not-edit`;
				let pantherSubCategoryTagInternalName = `fuore-subcategory-${scopeRelatedAttribute.sub_category}-scope_${pantherScope.key}-do-not-edit`;

				let fuoreIndicator = _.find(pantherData.esponFuoreIndicators, (fuoreIndicator) => {
					return fuoreIndicator.data.nameInternal === fuoreIndicatorNameInternal;
				});

				let fuoreCategoryTag = _.find(pantherData.tags, (fuoreCategoryTag) => {
					return fuoreCategoryTag.data.nameInternal === pantherCategoryTagInternalName
						&& !_.find(categoryOrder, (categoryOrderRecord) => {
							return categoryOrderRecord.key === fuoreCategoryTag.key
								&& categoryOrderRecord.order === scopeRelatedAttribute.category_order
						});
				});

				let fuoreSubCategoryTag = _.find(pantherData.tags, (fuoreSubCategoryTag) => {
					return fuoreSubCategoryTag.data.nameInternal === pantherSubCategoryTagInternalName
						&& !_.find(subCategoryOrder, (subCategoryOrderRecord) => {
							return subCategoryOrderRecord.key === fuoreSubCategoryTag.key
								&& subCategoryOrderRecord.order === scopeRelatedAttribute.sub_category_order
						});
				});

				indicatorOrder.push({
					key: fuoreIndicator.key,
					order: scopeRelatedAttribute.order
				});

				if (fuoreCategoryTag) {
					categoryOrder.push({
						key: fuoreCategoryTag.key,
						order: scopeRelatedAttribute.category_order
					});
				}

				if (fuoreSubCategoryTag) {
					subCategoryOrder.push({
						key: fuoreSubCategoryTag.key,
						order: scopeRelatedAttribute.sub_category_order
					})
				}
			}

			indicatorOrder = _.sortBy(indicatorOrder, [`order`, `asc`]);
			categoryOrder = _.sortBy(categoryOrder, [`order`, `asc`]);
			subCategoryOrder = _.sortBy(subCategoryOrder, [`order`, `asc`]);

			pantherScope.data.configuration.order = {
				esponFuoreIndicatorKeys: _.map(indicatorOrder, `key`),
				categoryTagKeys: _.map(categoryOrder, `key`),
				subCategoryTagKeys: _.map(subCategoryOrder, `key`)
			}
		}

		return this._pgMetadataCrud.update(
			{
				scopes: pantherData.scopes
			},
			user,
			{}
		);
	}

	updateConfigurationWithScopeOrder(user, pantherData) {
		let scopesOrder = [];

		return this._pgMetadataCrud.get(
			`scopes`,
			{
				filter: {
					applicationKey: "esponFuore"
				}
			},
			user
		).then((getResult) => {
			let pantherScopes = getResult.data.scopes;
			_.each(pantherScopes, (scope) => {
				scopesOrder.push({
					key: scope.key,
					order: scope.data.configuration.baseOrder
				})
			});

			let sortedScopeOrder = _.orderBy(scopesOrder, [`order`]);

			pantherData.fuoreConfiguration.data.data.order = {
				scopeKeys: _.map(sortedScopeOrder, `key`)
			};

			return this._pgApplicationsCrud.update(
				{
					configurations: [pantherData.fuoreConfiguration]
				},
				user,
				{}
			);
		})
	}

	prepareForImport(sourceJson, forceUpdate) {
		let order = {
			record: 1,
			category: [],
			subCategory: []
		};

		let outputJson = [];

		for (let jsonObject of sourceJson) {
			if (jsonObject.hasOwnProperty(`color`) && jsonObject.color === `standard`) {
				delete jsonObject.color;
			}

			if (jsonObject.hasOwnProperty(`delete`)) {
				jsonObject[`delete`] = jsonObject[`delete`] !== null && jsonObject[`delete`] !== false;
			}

			if (forceUpdate) {
				jsonObject[`update`] = true;
			} else if (jsonObject.hasOwnProperty(`update`)) {
				jsonObject[`update`] = jsonObject[`update`] !== null && jsonObject[`update`] !== false;
			}

			if (jsonObject.hasOwnProperty(`two_side_scale`)) {
				jsonObject[`two_side_scale`] = jsonObject[`two_side_scale`] !== null && jsonObject[`two_side_scale`] !== false;
			}

			if (!jsonObject.hasOwnProperty(`order`)) {
				jsonObject[`order`] = order.record++;
			}

			if (!jsonObject.hasOwnProperty(`category_order`) && jsonObject.hasOwnProperty(`analytical_unit`)) {
				if (!order.category.includes(jsonObject.category)) {
					order.category.push(jsonObject.category);
				}
				jsonObject[`category_order`] = order.category.length;
			}

			if (!jsonObject.hasOwnProperty(`sub_category_order`) && jsonObject.hasOwnProperty(`analytical_unit`)) {
				if (!order.subCategory.includes(jsonObject.sub_category)) {
					order.subCategory.push(jsonObject.sub_category);
				}
				jsonObject[`sub_category_order`] = order.subCategory.length;
			}

			if (jsonObject.hasOwnProperty(`type_of_region`)) {
				if (jsonObject.table_name === jsonObject.parent_table) {
					jsonObject.parent_table = null;
				}

				if (jsonObject.table_name && jsonObject.parent_table) {
					jsonObject.au_level = 2;

					let auLevel1Object = _.find(outputJson, (object) => {
						return object.relation_key && object.table_name === jsonObject.parent_table;
					});

					if (auLevel1Object) {
						jsonObject.relation_key = auLevel1Object.relation_key;
					} else {
						jsonObject.relation_key = uuidv4();
					}
				}

				if (jsonObject.table_name && !jsonObject.parent_table) {
					jsonObject.au_level = 1;

					let auLevel2Object = _.find(outputJson, (object) => {
						return object.parent_table === jsonObject.table_name && object.relation_key;
					});

					if (auLevel2Object) {
						jsonObject.relation_key = auLevel2Object.relation_key;
					} else {
						jsonObject.relation_key = uuidv4();
					}
				}

				if (!jsonObject.hasOwnProperty(`region_type`)) {
					if (jsonObject.type_of_region.startsWith(`Functional Urban Areas`)) {
						jsonObject.region_type = `fua`;
					} else if (jsonObject.type_of_region.startsWith(`Border 'large' (90 minutes)`)) {
						jsonObject.region_type = `border-large`;
					} else if (jsonObject.type_of_region.startsWith(`Border 'narrow' (45 minutes)`)) {
						jsonObject.region_type = `border-narrow`;
					} else if (jsonObject.type_of_region.startsWith(`Green Infrastructure`)) {
						jsonObject.region_type = `green-infrastructure`;
					} else if (jsonObject.type_of_region.startsWith(`Islands`)) {
						jsonObject.region_type = `islands`;
					} else if (jsonObject.type_of_region.startsWith(`Coasts II`)) {
						jsonObject.region_type = `msa`;
					} else if (jsonObject.type_of_region.startsWith(`Coasts I`)) {
						jsonObject.region_type = `tcoa`;
					} else if (jsonObject.type_of_region.startsWith(`Mountains`)) {
						jsonObject.region_type = `mountains`;
					} else if (jsonObject.type_of_region.startsWith(`Sparsely populated Areas`)) {
						jsonObject.region_type = `spa`;
					}
				}
			}

			outputJson.push(jsonObject);
		}

		return outputJson;
	}

	import(data, user, status) {
		let unzippedFs;
		let analyticalUnits;
		let attributes;
		let pantherData = {};

		let nameAttributeKey = "1032d588-6899-41a9-99b0-0a8f2c889f30";
		let countryCodeAttributeKey = "610157b0-df73-4976-bb08-a6471b4e1e0a";

		user.groups.push({id: 1, name: "admin"});

		return this.ensureFuoreConfiguration(user)
			.then((pFuoreConfiguration) => {
				pantherData.fuoreConfiguration = pFuoreConfiguration;
			})
			.then(() => {
				if (!data) {
					throw new Error(
						`missing zip package`
					);
				}

				unzippedFs = zipper.sync.unzip(data.path).memory();
			})
			.then(() => {
				return this.ensureAnalyticalUnits(unzippedFs)
					.then((pAnalyticalUnits) => {
						analyticalUnits = pAnalyticalUnits;
						console.log(`FuoreImport # ensureAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.ensureAttributesData(unzippedFs)
					.then((pAttributes) => {
						attributes = pAttributes;
						console.log(`FuoreImport # ensureAttributesData done`);
					})
			})
			.then(() => {
				return this.createPantherNameAttributeForFuore(nameAttributeKey, user)
					.then((pantherAttribute) => {
						pantherData.fuoreAuNameAttribute = pantherAttribute;
						console.log(`FuoreImport # createPantherNameAttributeForFuore done`);
					});
			})
			.then(() => {
				return this.createPantherCountryCodeAttributeForFuore(countryCodeAttributeKey, user)
					.then((pantherAttribute) => {
						pantherData.fuoreAuCountryCodeAttribute = pantherAttribute;
						console.log(`FuoreImport # createPantherCountryCodeAttributeForFuore done`);
					});
			})
			.then(() => {
				return this.createPantherCategoryTagForFuore(pantherData, user)
					.then((pantherTag) => {
						pantherData.fuoreCategoryTag = pantherTag;
						console.log(`FuoreImport # createPantherCategoryTagForFuore done`);
					});
			})
			.then(() => {
				return this.createPantherSubCategoryTagForFuore(pantherData, user)
					.then((pantherTag) => {
						pantherData.fuoreSubCategoryTag = pantherTag;
						console.log(`FuoreImport # createPantherSubCategoryTagForFuore done`);
					});
			})
			.then(() => {
				return this.createPantherLayerTemplatesForFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTemplates) => {
						pantherData.layerTemplates = pantherLayerTemplates;
						console.log(`FuoreImport # createPantherLayerTemplatesForFuoreAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.createPantherAttributesFromFuoreAttributes(attributes, analyticalUnits, user, pantherData)
					.then((pantherAttributes) => {
						pantherData.attributes = pantherAttributes;
						console.log(`FuoreImport # createPantherAttributesFromFuoreAttributes done`);
					})
			})
			.then(() => {
				return this.createPantherPeriodsFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherPeriods) => {
						pantherData.periods = pantherPeriods;
						console.log(`FuoreImport # createPantherPeriodsFromFuoreAttributes done`);
					})
			})
			.then(() => {
				return this.createPantherTagsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData)
					.then((pantherTags) => {
						pantherData.tags = pantherTags;
						console.log(`FuoreImport # createPantherTagsFromFuoreAttributes done`);
					})
			})
			.then(() => {
				return this.createPantherViewsFromFuoreAnalyticalUnits(attributes, analyticalUnits, user, pantherData)
					.then((pantherViews) => {
						pantherData.views = pantherViews;
						console.log(`FuoreImport # createPantherViewsFromFuoreAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherScopes) => {
						pantherData.scopes = pantherScopes;
						console.log(`FuoreImport # createPantherScopesFromFuoreAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.createPantherEsponFuoreIndicatorsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData)
					.then((pantherEsponFuoreIndicators) => {
						pantherData.esponFuoreIndicators = pantherEsponFuoreIndicators;
						console.log(`FuoreImport # createPantherEsponFuoreIndicatorsFromFuoreAttributes done`);
					})
			})
			.then(() => {
				return this.createPantherSpatialDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherSpatialDataSources) => {
						pantherData.spatialDataSources = pantherSpatialDataSources;
						console.log(`FuoreImport # createPantherSpatialDataSourceFromFuoreAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.createPantherAttributeDataSourceFromFuoreAttributes(attributes, analyticalUnits, user, pantherData)
					.then((pantherAttributeDataSources) => {
						pantherData.attributeDataSources = pantherAttributeDataSources;
						console.log(`FuoreImport # createPantherAttributeDataSourceFromFuoreAttributes done`);
					});
			})
			.then(() => {
				return this.createPantherNameAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user, nameAttributeKey)
					.then((pantherAttributeDataSources) => {
						pantherData.attributeDataSources = _.concat(pantherData.attributeDataSources, pantherAttributeDataSources,);
						console.log(`FuoreImport # createPantherNameAttributeDataSourceForFuoreAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.createPantherCountryCodeAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user, countryCodeAttributeKey)
					.then((pantherAttributeDataSources) => {
						pantherData.attributeDataSources = _.concat(pantherData.attributeDataSources, pantherAttributeDataSources);
						console.log(`FuoreImport # createPantherCountryCodeAttributeDataSourceForFuoreAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.createPantherLayerTreesForFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTrees) => {
						pantherData.layerTrees = pantherLayerTrees;
						console.log(`FuoreImport # createPantherLayerTreesForFuoreAnalyticalUnits done`);
					})
			})
			.then(() => {
				return this.createPantherSpatialRelations(analyticalUnits, user, pantherData)
					.then(() => {
						console.log(`FuoreImport # createPantherSpatialRelations done`);
					})
			})
			.then(() => {
				return this.createPantherAttributeRelations(attributes, analyticalUnits, user, pantherData)
					.then(() => {
						console.log(`FuoreImport # createPantherAttributeRelations done`);
					})
			})
			.then(() => {
				return this.setGuestPermissionsForPantherData(pantherData)
					.then(() => {
						console.log(`FuoreImport # setGuestPermissionsForPantherData done`);
					})
			})
			.then(() => {
				return this.updateScopeConfigurationsWithOrderData(attributes, analyticalUnits, user, pantherData)
					.then(() => {
						console.log(`FuoreImport # updateScopeConfigurationsWithOrderData done`);
					})
			})
			.then(() => {
				return this.updateConfigurationWithScopeOrder(user, pantherData)
					.then(() => {
						console.log(`FuoreImport # updateConfigurationWithScopeOrder done`);
					})
			})
			.then(() => {
				status.metadata = {
					analyticalUnits,
					attributes
				};
				status.ended = new Date().toISOString();
				status.state = `done`;
			})
			.catch((error) => {
				status.ended = new Date().toISOString();
				status.state =
					`done`
				;
				status.error = error.message;

				console.log(error);
			})
	}
}

module.exports = FuoreImporter;