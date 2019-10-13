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
		let attributeDataTableName = `fuore-attr_${attributeMetadata.uuid}`;
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
			await this.updateAttributeDataTable(attributeMetadata, unzippedFs, attributeDataFileName);
		} else {
			throw new Error(`analytical unit table ${attributeDataFileName} already exists`);
		}
	}

	async updateAttributeDataTable(attributeMetadata, unzippedFs, attributeDataFileName) {
		let attributeDataTableName = `fuore-attr_${attributeMetadata.uuid}`;
		let attributeData;
		if (unzippedFs.contents().includes(attributeDataFileName)) {
			attributeData = JSON.parse(unzippedFs.read(attributeDataFileName, 'text'));
		}

		let attributeMetadataYearsParts = attributeMetadata.years.split(`-`);
		let attributeMetadataStartYear = attributeMetadataYearsParts[0];
		let attributeMetadataEndYear = attributeMetadataYearsParts[1] || attributeMetadataYearsParts[0];

		let attributeMetadataYears = _.map(_.range(Number(attributeMetadataStartYear), Number(attributeMetadataEndYear) + 1), (yearNumber) => {
			return String(yearNumber);
		});

		let existingYearColumns = await this._pgPool
			.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${attributeDataTableName}' AND column_name ~ '^[0-9]{4}$';`)
			.then((queryResult) => {
				return _.map(queryResult.rows, (row) => {
					return row.column_name;
				})
			});

		let attributeMetadataYearsToUpdate = _.intersection(attributeMetadataYears, existingYearColumns);
		let attributeMetadataYearsToDelete = _.difference(existingYearColumns, attributeMetadataYears);
		let attributeMetadataYearsToAdd = _.difference(attributeMetadataYears, existingYearColumns);

		let updateQueries = [];

		if (attributeMetadataYearsToAdd.length && !attributeData) {
			throw new Error(`Unable to update data for attribute with uuid ${attributeMetadata.uuid}. Missing data file ${attributeDataFileName}`);
		}

		if (attributeMetadataYearsToDelete.length) {
			for (let year of attributeMetadataYearsToDelete) {
				updateQueries.push(`ALTER TABLE "${attributeDataTableName}" DROP COLUMN "${year}"`);
			}
		}

		if (attributeMetadataYearsToAdd.length) {
			let attributeDataFirst = attributeData[0];
			for (let year of attributeMetadataYearsToAdd) {
				let columnType;
				if (_.isString(attributeDataFirst[year])) {
					columnType = `TEXT`;
				} else if (_.isNumber(attributeDataFirst[year])) {
					columnType = `NUMERIC`;
				}

				if (columnType) {
					updateQueries.push(`ALTER TABLE "${attributeDataTableName}" ADD COLUMN "${year}" ${columnType}`);
				} else {
					throw new Error(`Unable to find data for column ${year} for attribute with uuid ${attributeMetadata.uuid}`);
				}
			}
		}

		let fidColumn = attributeMetadata.fid_column;

		if (attributeData) {
			updateQueries.push(`ALTER TABLE "${attributeDataTableName}" DROP CONSTRAINT IF EXISTS "${attributeDataTableName}_objectid_key"`);
			updateQueries.push(`ALTER TABLE "${attributeDataTableName}" ADD CONSTRAINT "${attributeDataTableName}_objectid_key" UNIQUE ("${fidColumn}")`);
		}

		for (let data of attributeData) {
			let columns = [], values = [], sets = [];

			_.forEach(data, (value, column) => {

				if (_.isString(value)) {
					value = `'${value}'`;
				}

				columns.push(`"${column}"`);
				values.push(value);
				sets.push(`"${column}" = ${value}`);
			});

			updateQueries.push(`INSERT INTO "${attributeDataTableName}" (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT ("${fidColumn}") DO UPDATE SET ${sets.join(', ')}`)
		}

		for (let query of updateQueries) {
			await this._pgPool.query(query);
		}
	}

	async createAttributeDataTable(attributeMetadata, unzippedFs) {
		let attributeDataTableName = `fuore-attr_${attributeMetadata.uuid}`;
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

		sql.push(`CREATE TABLE IF NOT EXISTS "public"."${attributeDataTableName}" (`);

		sql.push(`auto_fid serial primary key,`);

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

					let attributeMetadataIds = [];
					let attributeMetadataUuids = [];

					for (let attributeMetadata of attributes) {
						if (!attributeMetadata.hasOwnProperty(`id`)) {
							throw new Error(`missing id property in metadata of attribute ${attributeMetadata.name}`);
						}
						if (!attributeMetadata.hasOwnProperty(`uuid`)) {
							attributeMetadata.uuid = uuidv4();
						}

						if (attributeMetadataIds.includes(attributeMetadata.id)) {
							throw new Error(`Attributes units has non-unique ids`);
						}

						if (attributeMetadataUuids.includes(attributeMetadata.uuid)) {
							throw new Error(`Attributes units has non-unique uuids`);
						}

						attributeMetadataIds.push(attributeMetadata.id);
						attributeMetadataUuids.push(attributeMetadata.uuid);
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
						if (!attributeMetadata.hasOwnProperty(`color`)) {
							throw new Error(`missing color property in metadata of attribute ${attributeMetadata.name}`);
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
		return await this._pgMetadataCrud.update({
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

	createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, areaNameAttributeKey, countryCodeAttributeKey) {
		return Promise.resolve()
			.then(async () => {
				let pantherScopesToUpdateOrCreate = [];
				for (let analyticalUnit of analyticalUnits) {
					let scopeNameInternal = `fuore-au_${analyticalUnit.uuid}-do-not-edit`;
					pantherScopesToUpdateOrCreate.push(
						{
							key: analyticalUnit.uuid,
							data: {
								nameInternal: scopeNameInternal,
								nameDisplay: analyticalUnit.type_of_region,
								applicationKey: esponFuoreApplicationKey,
								description: analyticalUnit.description,
								configuration: {
									areaNameAttributeKey,
									countryCodeAttributeKey
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

	createPantherViewsFromFuoreAnalyticalUnits(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherViews = await this._pgViewsCrud.get(
					`views`,
					{
						filter: {
							applicationKey: esponFuoreApplicationKey
						}
					},
					user
				).then((getResults) => {
					return getResults.data.views;
				});

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

					let attributeYears = [];
					let commonYearValues = _.intersection(..._.map(attributesForAnalytiticalUnit, (attribute) => {
						let attributeYearsParts = attribute.years.split(`-`);
						let attributeYearStart = Number(attributeYearsParts[0]);
						let attributeYearEnd = Number(attributeYearsParts[1] || attributeYearStart);

						let years = _.range(attributeYearStart, attributeYearEnd);
						attributeYears.push(years);

						return years;
					}));

					let availableYearValues = _.uniq(_.flatten(attributeYears));

					let intervalYearValues = [
						_.nth(availableYearValues, 0),
						_.nth(availableYearValues, (availableYearValues.length / 2) - 1),
						_.nth(availableYearValues, availableYearValues.length - 1)
					];

					let activeYearValue = commonYearValues.length ? _.last(commonYearValues) : _.last(availableYearValues);
					let activeYearPeriodKey = _.find(pantherData.periods, (pantherPeriod) => {
						return pantherPeriod.data.nameInternal === `fuore-${String(activeYearValue)}-do-not-edit`;
					}).key;

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
						}
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
			.then(() => {
				return this.updateMetadata(
					`attributes`,
					[{
						key,
						data: {
							nameInternal: `fuore_au_name`,
							nameDisplay: `fuore_au_name`,
							applicationKey: esponFuoreApplicationKey
						}
					}], user
				)
			})
	}

	createPantherCountryCodeAttributeForFuore(key, user) {
		return Promise.resolve()
			.then(() => {
				return this.updateMetadata(
					`attributes`,
					[{
						key,
						data: {
							nameInternal: `fuore_au_country_code`,
							nameDisplay: `fuore_au_country_code`,
							applicationKey: esponFuoreApplicationKey
						}
					}], user
				)
			})
	}

	createPantherCategoryTagForFuore(pantherData, user) {
		let key = pantherData.fuoreConfiguration.data.data.categoryTagKey;
		return Promise.resolve()
			.then(() => {
				return this.updateMetadata(
					`tags`,
					[{
						key,
						data: {
							nameInternal: `fuore_category`,
							nameDisplay: `fuore_category`,
							applicationKey: esponFuoreApplicationKey
						}
					}], user
				)
			})
	}

	createPantherSubCategoryTagForFuore(pantherData, user) {
		let key = pantherData.fuoreConfiguration.data.data.subCategoryTagKey;
		return Promise.resolve()
			.then(() => {
				return this.updateMetadata(
					`tags`,
					[{
						key,
						data: {
							nameInternal: `fuore_sub_category`,
							nameDisplay: `fuore_sub_category`,
							applicationKey: esponFuoreApplicationKey
						}
					}], user
				)
			})
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

					let attributeNameInternal = `fuore-au_${analyticalUnit.uuid}-attr_${attribute.uuid}-do-not-edit`;
					pantherAttributesToUpdateOrCreate.push({
						key: attribute.uuid,
						data: {
							nameInternal: attributeNameInternal,
							nameDisplay: attribute.name,
							description: attribute.description,
							color: attribute.color,
							applicationKey: esponFuoreApplicationKey,
							unit: attribute.unit,
							valueType: attribute.value_type
						}
					});
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
						limit: 1000
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
							periodsToCreate.push({
								data: {
									nameInternal: `fuore-${String(period)}-do-not-edit`,
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

	createPantherTagsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let fuoreTags = await this._pgMetadataCrud.get(
					`tags`,
					{
						filter: {
							applicationKey: esponFuoreApplicationKey
						},
						limit: 1000
					},
					user
				).then((getResults) => {
					return getResults.data.tags;
				});

				let fuoreTagsToCreate = [];
				for (let attribute of attributes) {
					let analyticalUnit = _.find(analyticalUnits, (analyticalUnit) => {
						return analyticalUnit.id === attribute.analytical_unit_id;
					});


					if (!analyticalUnit) {
						throw new Error(`unable to create internal data structure - #ERR03`);
					}

					let pantherTagInternalName = `fuore-category-attr_${attribute.uuid}-au_${analyticalUnit.uuid}-do-not-edit`;
					if (
						!_.find(fuoreTags, (fuoreTag) => {
							return fuoreTag.data.nameInternal === pantherTagInternalName && fuoreTag.data.scopeKey === analyticalUnit.uuid
						})
						&& !_.find(fuoreTagsToCreate, (fuoreTag) => {
							return fuoreTag.data.nameInternal === pantherTagInternalName && fuoreTag.data.scopeKey === analyticalUnit.uuid
						})
					) {
						fuoreTagsToCreate.push({
							data: {
								nameInternal: pantherTagInternalName,
								nameDisplay: attribute.category,
								applicationKey: esponFuoreApplicationKey,
								scopeKey: analyticalUnit.uuid,
								tagKeys: [pantherData.fuoreCategoryTag.key]
							}
						})
					}

					pantherTagInternalName = `fuore-subcategory-attr_${attribute.uuid}-au_${analyticalUnit.uuid}-do-not-edit`;
					if (
						!_.find(fuoreTags, (fuoreTag) => {
							return fuoreTag.data.nameInternal === pantherTagInternalName
						})
						&& !_.find(fuoreTagsToCreate, (fuoreTag) => {
							return fuoreTag.data.nameInternal === pantherTagInternalName
						})
					) {
						fuoreTagsToCreate.push({
							data: {
								nameInternal: pantherTagInternalName,
								nameDisplay: attribute.sub_category,
								applicationKey: esponFuoreApplicationKey,
								scopeKey: analyticalUnit.uuid,
								tagKeys: [pantherData.fuoreSubCategoryTag.key]
							}
						})
					}
				}

				let fuoreTagsCreated = [];
				if (fuoreTagsToCreate.length) {
					await this._pgMetadataCrud.create(
						{
							tags: fuoreTagsToCreate
						},
						user,
						{}
					).then((createResult) => {
						fuoreTagsCreated = createResult.tags;
					})
				}

				return _.concat(fuoreTags, fuoreTagsCreated);

			});
	}

	createPantherEsponFuoreIndicatorsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData) {
		return Promise.resolve()
			.then(async () => {
				let pantherEsponFuoreIndicators = await this._pgSpecificCrud.get(
					`esponFuoreIndicators`,
					{},
					user
				).then((getResult) => {
					return getResult.data.esponFuoreIndicators;
				});

				let esponFuoreIndicatorsToCreateOrUpdate = [];
				for (let attribute of attributes) {
					let analyticalUnit = _.find(analyticalUnits, (analyticalUnitObject) => {
						return analyticalUnitObject.id === attribute.analytical_unit_id;
					});

					let categoryPantherTagInternalName = `fuore-category-attr_${attribute.uuid}-au_${analyticalUnit.uuid}-do-not-edit`;
					let subCategoryPantherTagInternalName = `fuore-subcategory-attr_${attribute.uuid}-au_${analyticalUnit.uuid}-do-not-edit`;

					let pantherTags = _.filter(pantherData.tags, (pantherTagObject) => {
						return pantherTagObject.data.nameInternal === categoryPantherTagInternalName || pantherTagObject.data.nameInternal === subCategoryPantherTagInternalName;
					});

					let pantherTagKeys = _.map(pantherTags, (pantherTagObject) => {
						return pantherTagObject.key;
					});

					let pantherView = _.find(pantherData.views, (pantherView) => {
						return pantherView.data.nameInternal === `fuore-base-au_${analyticalUnit.uuid}-do-not-edit`;
					});

					if (!analyticalUnit || !pantherTagKeys.length || !pantherView) {
						throw new Error(`unable to create internal data structure - #ERR04`);
					}

					let fuoreIndicatorNameInternal = `fuore-au_${analyticalUnit.uuid}-attr_${attribute.uuid}-do-not-edit`;

					let existingFuoreIndicator = _.find(pantherEsponFuoreIndicators, (pantherEsponFuoreIndicatorObject) => {
						return pantherEsponFuoreIndicatorObject.data.nameInternal === fuoreIndicatorNameInternal;
					});

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
								scopeKey: analyticalUnit.uuid,
								tagKeys: pantherTagKeys,
								viewKey: pantherView.key
							}
						}
					);
				}

				return await this._pgSpecificCrud.update(
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
				let pantherSpatialDataSources = await this._pgDataSourcesCrud.get(
					`spatial`,
					{
						"filter": {
							"tableName": {
								"like": "fuore-au\\_"
							}
						}
					},
					user
				).then((getResult) => {
					return getResult.data.spatial;
				});

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

	createPantherNameAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user) {
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
						limit: 9999
					},
					user
				).then((getResult) => {
					return getResult.data.attribute
				});

				let pantherAttributeDataSourcesToCreateOrUpdate = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au_${analyticalUnit.uuid}`;

					let existingAttributeDataSource = _.find(pantherAttributeDataSources, (pantherAttributeDataSourceObject) => {
						return pantherAttributeDataSourceObject.data.tableName === analyticalUnitTableName && pantherAttributeDataSourceObject.data.columnName === analyticalUnit.name_column;
					});

					let key = existingAttributeDataSource ? existingAttributeDataSource.key : uuidv4();

					pantherAttributeDataSourcesToCreateOrUpdate.push(
						{
							key,
							data: {
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

	createPantherCountryCodeAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributeDataSources = await this._pgDataSourcesCrud.get(
					`attribute`,
					{
						filter: {
							tableName: {
								like: "fuore-au\\_"
							}
						}
					},
					user
				).then((getResult) => {
					return getResult.data.attribute
				});

				let pantherAttributeDataSourcesToCreateOrUpdate = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au_${analyticalUnit.uuid}`;

					let existingAttributeDataSource = _.find(pantherAttributeDataSources, (pantherAttributeDataSourceObject) => {
						return pantherAttributeDataSourceObject.data.tableName === analyticalUnitTableName && pantherAttributeDataSourceObject.data.columnName === analyticalUnit.country_code_column;
					});

					let key = existingAttributeDataSource ? existingAttributeDataSource.key : uuidv4();

					pantherAttributeDataSourcesToCreateOrUpdate.push(
						{
							key,
							data: {
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

	createPantherAttributeDataSourceFromFuoreAttributes(attributes, user, pantherData) {
		return Promise.resolve()
			.then(async () => {

				let pantherAttributeDataSources = await this._pgDataSourcesCrud.get(
					`attribute`,
					{
						filter: {
							tableName: {
								like: `fuore-attr\\_`
							}
						},
						limit: 9999
					},
					user
				).then((getResult) => {
					return getResult.data.attribute;
				});

				let pantherAttributeDataSourcesToCreateOrUpdate = [];
				for (let attribute of attributes) {
					let yearsParts = attribute.years.split(`-`);
					let yearStart = Number(yearsParts[0]);
					let yearEnd = Number(yearsParts[1] || yearStart);

					for (let year of _.range(yearStart, yearEnd)) {
						let tableName = `fuore-attr_${attribute.uuid}`;
						let columnName = String(year);
						let existingPantherAttributeDataSource = _.find(pantherAttributeDataSources, (pantherAttributeDataSourceObject) => {
							return pantherAttributeDataSourceObject.data.tableName === tableName && pantherAttributeDataSourceObject.data.columnName === columnName;
						});

						let pantherAttributeDataSourceKey = existingPantherAttributeDataSource ? existingPantherAttributeDataSource.key : uuidv4();

						pantherAttributeDataSourcesToCreateOrUpdate.push(
							{
								key: pantherAttributeDataSourceKey,
								data: {
									tableName,
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
						}
					},
					user
				).then((getRestult) => {
					return getRestult.data.layerTemplates;
				});

				let pantherLayerTemplatesToCreate = [];
				for (let analyticalUnit of analyticalUnits) {
					let pantherLayerTemplateNameInternal = `fuore-au_${analyticalUnit.uuid}-do-not-edit`;
					let existingPantherLayerTemplate = _.find(pantherLayerTemplates, (pantherLayerTemplate) => {
						return pantherLayerTemplate.data.nameInternal === pantherLayerTemplateNameInternal;
					});

					if (!existingPantherLayerTemplate) {
						pantherLayerTemplatesToCreate.push(
							{
								data: {
									nameDisplay: analyticalUnit.type_of_region,
									nameInternal: pantherLayerTemplateNameInternal,
									applicationKey: esponFuoreApplicationKey
								}
							}
						)
					}
				}

				let createdPantherLayerTemplates = [];
				if (pantherLayerTemplatesToCreate.length) {
					await this._pgMetadataCrud.create(
						{
							layerTemplates: pantherLayerTemplatesToCreate
						},
						user,
						{}
					).then(([data, errors]) => {
						createdPantherLayerTemplates = data.layerTemplates
					})
				}

				return _.concat(pantherLayerTemplates, createdPantherLayerTemplates);
			})
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
						limit: 9999
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

					if (!pantherSpatialDataSource || !pantherLayerTemplate) {
						throw new Error(`unable to create internal data structure - #ERR05`);
					}

					let existingPantherSpatialRelation = _.find(existingPantherSpatialRelations, (pantherSpatialRelationObject) => {
						return pantherSpatialRelationObject.data.scopeKey === analyticalUnit.uuid
							&& pantherSpatialRelationObject.data.spatialDataSourceKey === pantherSpatialDataSource.key
							&& pantherSpatialRelationObject.data.layerTemplateKey === pantherLayerTemplate.key
							&& pantherSpatialRelationObject.data.fidColumnName === analyticalUnit.fid_column
					});

					let key = existingPantherSpatialRelation ? existingPantherSpatialRelation.key : uuidv4();

					pantherSpatialRelationsToCreateOrUpdate.push(
						{
							key,
							data: {
								scopeKey: analyticalUnit.uuid,
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
				let existingAttributeRelations = await this._pgRelationsCrud.get(
					`attribute`,
					{
						filter: {
							scopeKey: {
								in: _.map(analyticalUnits, `uuid`)
							}
						}
					},
					user
				).then((getRequest) => {
					return getRequest.data.attribute
				});

				for (let pantherAttributeDataSourceObject of pantherData.attributeDataSources) {
					console.log(`pantherAttributeDataSourceObject ${JSON.stringify(pantherAttributeDataSourceObject)}`);

					let attribute = _.find(attributes, (attribute) => {
						return pantherAttributeDataSourceObject.data.tableName.includes(attribute.uuid);
					});

					console.log(`attribute ${JSON.stringify(attribute)}`);

					let analyticalUnit = _.find(analyticalUnits, (analyticalUnit) => {
						return pantherAttributeDataSourceObject.data.tableName.includes(analyticalUnit.uuid) || analyticalUnit.id === attribute.analytical_unit_id;
					});

					console.log(`analyticalUnit ${JSON.stringify(analyticalUnit)}`);

					let pantherScopeObject = _.find(pantherData.scopes, (pantherScopeObject) => {
						return pantherScopeObject.key === analyticalUnit.uuid;
					});

					console.log(`pantherScopeObject ${JSON.stringify(pantherScopeObject)}`);

					let pantherLayerTemplateObject = _.find(pantherData.layerTemplates, (pantherLayerTemplateObject) => {
						return pantherLayerTemplateObject.data.nameInternal.includes(`au_${analyticalUnit.uuid}`);
					});

					console.log(`pantherLayerTemplateObject ${JSON.stringify(pantherLayerTemplateObject)}`);

					let pantherPeriodObject = _.find(pantherData.periods, (pantherPeriodObject) => {
						return pantherPeriodObject.data.nameInternal.includes(pantherAttributeDataSourceObject.data.columnName);
					});

					console.log(`pantherPeriodObject ${JSON.stringify(pantherPeriodObject)}`);


					console.log(``);
				}

				// for (let attributeDataSource of pantherData.attributeDataSources) {
				// 	let scope = _.find(pantherData.scopes, (scope) => {
				// 		return scope.linkage.analyticalUnitId === attributeDataSource.linkage.analyticalUnitId
				// 	});
				// 	let layerTemplate = _.find(pantherData.layerTemplates, (layerTemplate) => {
				// 		return layerTemplate.linkage.analyticalUnitId === attributeDataSource.linkage.analyticalUnitId
				// 	});
				// 	let period = _.find(pantherData.periods, (period) => {
				// 		return period.data.nameInternal === attributeDataSource.data.columnName;
				// 	});
				// 	let attribute = _.find(pantherData.attributes, (attribute) => {
				// 		return attribute.linkage.attributeId === attributeDataSource.linkage.attributeId;
				// 	});
				//
				// 	if (!attribute && attributeDataSource.linkage.isAnalyticalUnitName) {
				// 		attribute = {
				// 			...pantherData.fuoreAuNameAttribute,
				// 			linkage: {
				// 				attributeFidColumn: attributeDataSource.linkage.attributeFidColumn
				// 			}
				// 		};
				// 		period = {key: null};
				// 	}
				//
				// 	if (!attribute && attributeDataSource.linkage.isAnalyticalUnitCountryCode) {
				// 		attribute = {
				// 			...pantherData.fuoreAuCountryCodeAttribute,
				// 			linkage: {
				// 				attributeFidColumn: attributeDataSource.linkage.attributeFidColumn
				// 			}
				// 		};
				// 		period = {key: null};
				// 	}
				//
				// 	if (!scope || !layerTemplate || !period || !attribute) {
				// 		throw new Error(`unable to create internal data structure - #ERR06`);
				// 	}
				//
				// 	let periodKeyWhereSql = period.key ? `"periodKey" = '${period.key}'` : `"periodKey" IS NULL`;
				// 	let periodKeyInsertSql = period.key ? `'${period.key}'` : `NULL`;
				//
				// 	await this._pgPool.query(
				// 		`SELECT * FROM "relations"."attributeDataSourceRelation" WHERE
				// 			"scopeKey" = '${scope.key}'
				// 			AND "attributeDataSourceKey" = '${attributeDataSource.key}'
				// 			AND "layerTemplateKey" = '${layerTemplate.key}'
				// 			AND ${periodKeyWhereSql}
				// 			AND "attributeKey" = '${attribute.key}'
				// 			AND "fidColumnName" = '${attribute.linkage.attributeFidColumn}'`
				// 	).then((pgResult) => {
				// 		if (!pgResult.rows[0]) {
				// 			return this._pgPool.query(
				// 				`INSERT INTO "relations"."attributeDataSourceRelation" (
				// 					"scopeKey",
				// 					"periodKey",
				// 					"attributeDataSourceKey",
				// 					"layerTemplateKey",
				// 					"attributeKey",
				// 					"fidColumnName"
				// 				) VALUES (
				// 					'${scope.key}',
				// 					${periodKeyInsertSql},
				// 					'${attributeDataSource.key}',
				// 					'${layerTemplate.key}',
				// 					'${attribute.key}',
				// 					'${attribute.linkage.attributeFidColumn}'
				// 				)`
				// 			)
				// 		}
				// 	})
				// }

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

	getFuoreConfiguration(user) {
		let categoryTagKey = "75a06319-ed4d-4750-a139-86619c7b1283";
		let subCategoryTagKey = "5decb5ec-40ea-498a-b92a-b53870f548ec";

		return this._pgApplicationsCrud.get(`configurations`, {
			filter: {
				applicationKey: "esponFuore"
			}
		}, user).then((getResult) => {
			if (getResult.data.configurations[0]) {
				return getResult.data.configurations[0];
			} else {
				return this._pgApplicationsCrud.create(
					{
						configurations: [
							{
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
				).then(([data, errors]) => {
					return data.configurations[0];
				})
			}
		})
	}

	import(data, user, status) {
		let unzippedFs;
		let analyticalUnits;
		let attributes;
		let pantherData = {};

		let nameAttributeKey = "1032d588-6899-41a9-99b0-0a8f2c889f30";
		let countryCodeAttributeKey = "610157b0-df73-4976-bb08-a6471b4e1e0a";

		user.groups.push({id: 1, name: "admin"});

		return this.getFuoreConfiguration(user)
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
					})
			})
			.then(() => {
				return this.ensureAttributesData(unzippedFs)
					.then((pAttributes) => {
						attributes = pAttributes;
					})
			})
			.then(() => {
				return this.createPantherNameAttributeForFuore(nameAttributeKey, user)
					.then((pantherAttributes) => {
						pantherData.fuoreAuNameAttribute = pantherAttributes[0];
					});
			})
			.then(() => {
				return this.createPantherCountryCodeAttributeForFuore(countryCodeAttributeKey, user)
					.then((pantherAttributes) => {
						pantherData.fuoreAuCountryCodeAttribute = pantherAttributes[0];
					});
			})
			.then(() => {
				return this.createPantherCategoryTagForFuore(pantherData, user)
					.then((pantherTags) => {
						pantherData.fuoreCategoryTag = pantherTags[0];
					});
			})
			.then(() => {
				return this.createPantherSubCategoryTagForFuore(pantherData, user)
					.then((pantherTags) => {
						pantherData.fuoreSubCategoryTag = pantherTags[0];
					});
			})
			.then(() => {
				return this.createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData.fuoreAuNameAttribute.key, pantherData.fuoreAuCountryCodeAttribute.key)
					.then((pantherScopes) => {
						pantherData.scopes = pantherScopes;
					})
			})
			.then(() => {
				return this.createPantherAttributesFromFuoreAttributes(attributes, analyticalUnits, user, pantherData)
					.then((pantherAttributes) => {
						pantherData.attributes = pantherAttributes;
					})
			})
			.then(() => {
				return this.createPantherPeriodsFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherPeriods) => {
						pantherData.periods = pantherPeriods;
					})
			})
			.then(() => {
				return this.createPantherTagsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData)
					.then((pantherTags) => {
						pantherData.tags = pantherTags;
					})
			})
			.then(() => {
				return this.createPantherLayerTemplatesForFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTemplates) => {
						pantherData.layerTemplates = pantherLayerTemplates;
					})
			})
			.then(() => {
				return this.createPantherViewsFromFuoreAnalyticalUnits(attributes, analyticalUnits, user, pantherData)
					.then((pantherViews) => {
						pantherData.views = pantherViews;
					})
			})
			.then(() => {
				return this.createPantherEsponFuoreIndicatorsFromFuoreAttributes(attributes, analyticalUnits, user, pantherData)
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
				return this.createPantherNameAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user)
					.then((pantherAttributeDataSources) => {
						pantherData.attributeDataSources = _.concat(pantherData.attributeDataSources, pantherAttributeDataSources);
					})
			})
			.then(() => {
				return this.createPantherCountryCodeAttributeDataSourceForFuoreAnalyticalUnits(analyticalUnits, user)
					.then((pantherAttributeDataSources) => {
						pantherData.attributeDataSources = _.concat(pantherData.attributeDataSources, pantherAttributeDataSources);
					})
			})
			.then(() => {
				return this.createPantherLayerTreesForFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTrees) => {
						pantherData.layerTrees = pantherLayerTrees;
					})
			})
			.then(() => {
				return this.createPantherSpatialRelations(analyticalUnits, user, pantherData);
			})
			.then(() => {
				return this.createPantherAttributeRelations(attributes, analyticalUnits, user, pantherData);
			})
			.then(() => {
				throw new Error(`Stopped due testing purposes!`);
			})
			.then(() => {
				return this.setGuestPermissionsForPantherData(pantherData)
					.then(() => {
					})
			})
			.then(() => {
				status.metadata = {
					analyticalUnits,
					attributes
				};
				status.ended = new Date().toISOString();
				status.state = `done`;

				console.log(status);
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