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
		let analyticalUnitTableName = `fuore-au-${analyticalUnitMetadata.uuid}`;
		await this._pgPool.query(`DROP TABLE IF EXISTS "public"."${analyticalUnitTableName}"`);
	}

	async createAnalyticalUnitTable(analyticalUnitMetadata, unzippedFs) {
		let analyticalUnitTableName = `fuore-au-${analyticalUnitMetadata.uuid}`;
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
		let analyticalUnitTableName = `fuore-au-${analyticalUnitMetadata.uuid}`;
		return await this._pgPool
			.query(`SELECT count(*) FROM pg_tables WHERE "schemaname" = 'public' AND "tablename" = '${analyticalUnitTableName}';`)
			.then((pgResults) => {
				return !!(Number(pgResults.rows[0].count));
			});
	}

	async isAttributeDataTableExisting(attributeMetadata) {
		let attributeDataTableName = `fuore-attr-${attributeMetadata.uuid}`;
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
		let attributeDataTableName = `fuore-attr-${attributeMetadata.uuid}`;
		let attributeData;
		if (unzippedFs.contents().includes(attributeDataFileName)) {
			attributeData = JSON.parse(unzippedFs.read(attributeDataFileName, 'text'));
		}

		let attributeMetadataYearsParts = attributeMetadata.years.split(`-`);
		let attributeMetadataStartYear = attributeMetadataYearsParts[0];
		let attributeMetadataEndYear = attributeMetadataYearsParts[1] || attributeMetadataYearsParts[0];

		let attributeMetadataYears = _.map(_.range(Number(attributeMetadataStartYear), Number(attributeMetadataEndYear)+1), (yearNumber) => {
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

		if(attributeMetadataYearsToAdd.length && !attributeData) {
			throw new Error(`Unable to update data for attribute with uuid ${attributeMetadata.uuid}. Missing data file ${attributeDataFileName}`);
		}

		if(attributeMetadataYearsToDelete.length) {
			for(let year of attributeMetadataYearsToDelete) {
				updateQueries.push(`ALTER TABLE "${attributeDataTableName}" DROP COLUMN "${year}"`);
			}
		}

		if(attributeMetadataYearsToAdd.length) {
			let attributeDataFirst = attributeData[0];
			for(let year of attributeMetadataYearsToAdd) {
				let columnType;
				if (_.isString(attributeDataFirst[year])) {
					columnType = `TEXT`;
				} else if (_.isNumber(attributeDataFirst[year])) {
					columnType = `NUMERIC`;
				}

				if(columnType) {
					updateQueries.push(`ALTER TABLE "${attributeDataTableName}" ADD COLUMN "${year}" ${columnType}`);
				} else {
					throw new Error(`Unable to find data for column ${year} for attribute with uuid ${attributeMetadata.uuid}`);
				}
			}
		}

		let fidColumn = attributeMetadata.fid_column;

		if(attributeData) {
			updateQueries.push(`ALTER TABLE "${attributeDataTableName}" DROP CONSTRAINT IF EXISTS "${attributeDataTableName}_objectid_key"`);
			updateQueries.push(`ALTER TABLE "${attributeDataTableName}" ADD CONSTRAINT "${attributeDataTableName}_objectid_key" UNIQUE ("${fidColumn}")`);
		}

		for(let data of attributeData) {
			let columns = [], values = [], sets = [];

			_.forEach(data, (value, column) => {

				if(_.isString(value)) {
					value = `'${value}'`;
				}

				columns.push(`"${column}"`);
				values.push(value);
				sets.push(`"${column}" = ${value}`);
			});

			updateQueries.push(`INSERT INTO "${attributeDataTableName}" (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT ("${fidColumn}") DO UPDATE SET ${sets.join(', ')}`)
		}

		for(let query of updateQueries) {
			await this._pgPool.query(query);
		}
	}

	async createAttributeDataTable(attributeMetadata, unzippedFs) {
		let attributeDataTableName = `fuore-attr-${attributeMetadata.uuid}`;
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
			if(column === attributeMetadata.fid_column) {
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
				let pantherScopes = [];
				for (let analyticalUnit of analyticalUnits) {
					let scopeNameInternal = `${analyticalUnit.type_of_region} - ${analyticalUnit.id}`;
					await this.createMetadata(
						`scopes`,
						{
							nameInternal: scopeNameInternal,
							applicationKey: esponFuoreApplicationKey
						},
						{
							nameInternal: scopeNameInternal,
							nameDisplay: analyticalUnit.type_of_region,
							applicationKey: esponFuoreApplicationKey,
							configuration: {
								areaNameAttributeKey,
								countryCodeAttributeKey
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

	createPantherCountryCodeAttributeForFuore(key, user) {
		return Promise.resolve()
			.then(() => {
				return this.createMetadata(
					`attributes`,
					{
						nameInternal: `fuore_au_country_code`,
						applicationKey: esponFuoreApplicationKey
					},
					{
						nameInternal: `fuore_au_country_code`,
						nameDisplay: `fuore_au_country_code`,
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

					let subCategoryTagNameInternal = `${attribute.sub_category} - ${scope.data.nameInternal}`;
					let subCategoryTag;
					await this.createMetadata(
						`tags`,
						{
							nameInternal: subCategoryTagNameInternal,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key
						},
						{
							nameInternal: subCategoryTagNameInternal,
							nameDisplay: attribute.sub_category,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key
						},
						user
					).then((tags) => {
						subCategoryTag = tags[0];
					});

					let categoryTagNameInternal = `${attribute.category} - ${scope.data.nameInternal}`;
					await this.createMetadata(
						`tags`,
						{
							nameInternal: categoryTagNameInternal,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key
						},
						{
							nameInternal: categoryTagNameInternal,
							nameDisplay: attribute.category,
							applicationKey: esponFuoreApplicationKey,
							scopeKey: scope.key,
							tagKeys: [subCategoryTag.key]
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

					let indicatorNameInternal = `${attribute.name} - ${pantherScope.data.nameInternal} - ${attribute.id}`;

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

	createPantherCountryCodeAttributeDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user) {
		return Promise.resolve()
			.then(async () => {
				let pantherAttributeDataSources = [];
				for (let analyticalUnit of analyticalUnits) {
					let analyticalUnitTableName = `fuore-au-${analyticalUnit.table_name}`;

					await this.createDataSource(
						`attribute`,
						{
							tableName: analyticalUnitTableName,
							columnName: analyticalUnit.country_code_column
						},
						{
							tableName: analyticalUnitTableName,
							columnName: analyticalUnit.country_code_column
						},
						user
					).then((attributeDataSources) => {
						pantherAttributeDataSources.push({
							...attributeDataSources[0],
							linkage: {
								analyticalUnitId: analyticalUnit.id,
								attributeFidColumn: analyticalUnit.fid_column,
								attributeNameColumn: analyticalUnit.name_column,
								countryCodeColumn: analyticalUnit.country_code_column,
								isAnalyticalUnitCountryCode: true
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
				let pantherAttributeDataSourcesToCreate = [];

				for (let attribute of attributes) {
					let attributeTableName = `fuore-attr-${attribute.table_name}`;
					let years = attribute.years.split(`-`);
					if (years.length !== 2) {
						throw new Error(`Years for attribute '${attribute.name}' has wrong format`)
					}

					for (let year = Number(years[0]); year <= Number(years[1]); year++) {
						await this._pgPool.query(`SELECT * FROM "dataSources"."attributeDataSource" WHERE "tableName" = '${attributeTableName}' AND "columnName" = '${String(year)}'`)
							.then((pgResult) => {
								if (pgResult.rows[0]) {
									return pgResult.rows[0];
								} else {
									return this._pgPool.query(`INSERT INTO "dataSources"."attributeDataSource" ("tableName", "columnName") VALUES ('${attributeTableName}', '${String(year)}') RETURNING *`)
										.then((pgResult) => {
											return pgResult.rows[0];
										})
								}
							})
							.then((attributeDataSourceRaw) => {
								pantherAttributeDataSources.push({
									key: attributeDataSourceRaw.key,
									data: {
										...attributeDataSourceRaw,
										key: undefined
									}, linkage: {
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

					if (!attribute && attributeDataSource.linkage.isAnalyticalUnitCountryCode) {
						attribute = {
							...pantherData.fuoreAuCountryCodeAttribute,
							linkage: {
								attributeFidColumn: attributeDataSource.linkage.attributeFidColumn
							}
						};
						period = {key: null};
					}

					if (!scope || !layerTemplate || !period || !attribute) {
						throw new Error(`unable to create internal data structure - #ERR06`);
					}

					let periodKeyWhereSql = period.key ? `"periodKey" = '${period.key}'` : `"periodKey" IS NULL`;
					let periodKeyInsertSql = period.key ? `'${period.key}'` : `NULL`;

					await this._pgPool.query(
						`SELECT * FROM "relations"."attributeDataSourceRelation" WHERE 
							"scopeKey" = '${scope.key}' 
							AND "attributeDataSourceKey" = '${attributeDataSource.key}'
							AND "layerTemplateKey" = '${layerTemplate.key}'
							AND ${periodKeyWhereSql}
							AND "attributeKey" = '${attribute.key}'
							AND "fidColumnName" = '${attribute.linkage.attributeFidColumn}'`
					).then((pgResult) => {
						if (!pgResult.rows[0]) {
							return this._pgPool.query(
								`INSERT INTO "relations"."attributeDataSourceRelation" (
									"scopeKey", 
									"periodKey", 
									"attributeDataSourceKey", 
									"layerTemplateKey", 
									"attributeKey", 
									"fidColumnName"
								) VALUES (
									'${scope.key}',
									${periodKeyInsertSql},
									'${attributeDataSource.key}',
									'${layerTemplate.key}',
									'${attribute.key}',
									'${attribute.linkage.attributeFidColumn}'
								)`
							)
						}
					})
				}

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

	import(data, user, status) {
		let unzippedFs;
		let analyticalUnits;
		let attributes;
		let pantherData = {};

		return Promise.resolve()
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
						status.progress =
							`1/19`
						;
						analyticalUnits = pAnalyticalUnits;
					})
			})
			.then(() => {
				return this.ensureAttributesData(unzippedFs)
					.then((pAttributes) => {
						status.progress =
							`2/19`
						;
						attributes = pAttributes;
					})
			})
			.then(() => {
				throw new Error(`Stopped due testing purposes!`);
			})
			.then(() => {
				return this.createPantherNameAttributeForFuore(uuidv4(), user)
					.then((pantherAttributes) => {
						status.progress =
							`3/19`
						;
						pantherData.fuoreAuNameAttribute = pantherAttributes[0];
					});
			})
			.then(() => {
				return this.createPantherCountryCodeAttributeForFuore(uuidv4(), user)
					.then((pantherAttributes) => {
						status.progress =
							`4/19`
						;
						pantherData.fuoreAuCountryCodeAttribute = pantherAttributes[0];
					});
			})
			.then(() => {
				return this.createPantherScopesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData.fuoreAuNameAttribute.key, pantherData.fuoreAuCountryCodeAttribute.key)
					.then((pantherScopes) => {
						status.progress =
							`5/19`
						;
						pantherData.scopes = pantherScopes;
					})
			})
			.then(() => {
				return this.createPantherAttributesFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherAttributes) => {
						status.progress =
							`6/19`
						;
						pantherData.attributes = pantherAttributes;
					})
			})
			.then(() => {
				return this.createPantherPeriodsFromFuoreAttributes(attributes, user)
					.then((pantherPeriods) => {
						status.progress =
							`7/19`
						;
						pantherData.periods = pantherPeriods;
					})
			})
			.then(() => {
				return this.createPantherTagsFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherTags) => {
						status.progress =
							`8/19`
						;
						pantherData.tags = pantherTags;
					})
			})
			.then(() => {
				return this.createPantherLayerTemplatesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTemplates) => {
						status.progress =
							`9/19`
						;
						pantherData.layerTemplates = pantherLayerTemplates;
					});
			})
			.then(() => {
				return this.createPantherViewsFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherViews) => {
						status.progress =
							`10/19`
						;
						pantherData.views = pantherViews;
					})
			})
			.then(() => {
				return this.createPantherEsponFuoreIndicatorsFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherEsponFuoreIndicators) => {
						status.progress =
							`11/19`
						;
						pantherData.esponFuoreIndicators = pantherEsponFuoreIndicators;
					})
			})
			.then(() => {
				return this.createPantherSpatialDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherSpatialDataSources) => {
						status.progress =
							`12/19`
						;
						pantherData.spatialDataSources = pantherSpatialDataSources;
					})
			})
			.then(() => {
				return this.createPantherAttributeDataSourceFromFuoreAttributes(attributes, user, pantherData)
					.then((pantherAttributeDataSources) => {
						status.progress =
							`13/19`
						;
						pantherData.attributeDataSources = pantherAttributeDataSources;
					});
			})
			.then(() => {
				return this.createPantherNameAttributeDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user)
					.then((pantherAttributeDataSources) => {
						status.progress =
							`14/19`
						;
						pantherData.attributeDataSources = _.concat(pantherData.attributeDataSources, pantherAttributeDataSources);
					})
			})
			.then(() => {
				return this.createPantherCountryCodeAttributeDataSourceFromFuoreAnalyticalUnits(analyticalUnits, user)
					.then((pantherAttributeDataSources) => {
						status.progress =
							`15/19`
						;
						pantherData.attributeDataSources = _.concat(pantherData.attributeDataSources, pantherAttributeDataSources);
					})
			})
			.then(() => {
				return this.createPantherLayerTreesFromFuoreAnalyticalUnits(analyticalUnits, user, pantherData)
					.then((pantherLayerTrees) => {
						status.progress =
							`16/19`
						;
						pantherData.layerTrees = pantherLayerTrees;
					})
			})
			.then(() => {
				return this.createPantherSpatialRelations(pantherData, user)
					.then(() => {
						status.progress =
							`17/19`
						;
					})
			})
			.then(() => {
				return this.createPantherAttributeRelations(pantherData, user)
					.then(() => {
						status.progress =
							`18/19`
						;
					})
			})
			.then(() => {
				return this.setGuestPermissionsForPantherData(pantherData)
					.then(() => {
						status.progress =
							`19/19`
						;
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