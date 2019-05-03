const _ = require(`lodash`);

const config = require(`../config`);

const PgScenarios = require('../metadata/PgScenarios');
const PgCases = require('../metadata/PgCases');
const PgScopes = require('../metadata/PgScopes');
const PgPlaces = require('../metadata/PgPlaces');
const PgPeriods = require('../metadata/PgPeriods');
const PgAttributeSets = require('../metadata/PgAttributeSets');
const PgAttributes = require('../metadata/PgAttributes');
const PgLayerTemplates = require('../metadata/PgLayerTemplates');
const PgAreaTrees = require('../metadata/PgAreaTrees');
const PgAreaTreeLevels = require('../metadata/PgAreaTreeLevels');
const PgTags = require('../metadata/PgTags');

const PgSpatialDataSourceRelations = require(`../relations/PgSpatialDataSourceRelations`);
const PgAttributeDataSourceRelations = require(`../relations/PgAttributeDataSourceRelations`);
const PgAreaRelations = require(`../relations/PgAreaRelations`);

const PgCommonSpatialDataSource = require(`../dataSources/PgCommonSpatialDataSource`);
const PgAttributeDataSource = require(`../dataSources/PgAttributeDataSource`);

const PgLayerTrees = require(`../application/PgLayerTrees`);
const PgConfigurations = require(`../application/PgConfigurations`);
const PgApplications = require(`../application/PgApplications`);

const PgViews = require(`../view/PgViews`);

const PgUsers = require(`../user/PgUsers`);

const PgEsponFuoreIndicators = require(`../specific/PgEsponFuoreIndicators`);

class PgDatabase {
	constructor(pgPool) {
		this._pgPool = pgPool;

		this._dataTypes = [
			{
				group: `metadata`,
				schema: config.pgSchema.metadata,
				stores: [
					PgScenarios,
					PgCases,
					PgScopes,
					PgPlaces,
					PgPeriods,
					PgAttributeSets,
					PgAttributes,
					PgLayerTemplates,
					PgAreaTrees,
					PgAreaTreeLevels,
					PgTags
				]
			},
			{
				group: `relations`,
				schema: config.pgSchema.relations,
				stores: [
					PgSpatialDataSourceRelations,
					PgAttributeDataSourceRelations,
					PgAreaRelations
				]
			},
			{
				group: `dataSources`,
				schema: config.pgSchema.dataSources,
				stores: [
					PgCommonSpatialDataSource,
					PgAttributeDataSource
				]
			},
			{
				group: `application`,
				schema: config.pgSchema.application,
				stores: [
					PgLayerTrees,
					PgConfigurations,
					PgApplications
				]
			},
			{
				group: `views`,
				schema: config.pgSchema.views,
				stores: [
					PgViews
				]
			},
			{
				schema: config.pgSchema.data,
				stores: [
					PgUsers
				]
			},
			{
				group: `specific`,
				schema: config.pgSchema.specific,
				stores: [
					PgEsponFuoreIndicators
				]
			}
		]
	}

	getDataTypeStoresGroupedByType() {
		return this._dataTypes;
	}

	ensure() {
		return this.ensureSchemas()
			.then(async () => {
				for(let dataType of this._dataTypes) {
					await this.ensureTables(dataType.stores, dataType.schema);
				}
			});
	}

	ensureSchemas() {
		let schemasSql = [
			`BEGIN;`
		];
		_.each(config.pgSchema, (value) => {
			schemasSql.push(
				`CREATE SCHEMA IF NOT EXISTS "${value}";`
			)
		});

		schemasSql.push(
			`COMMIT;`
		);

		return this._pgPool.query(schemasSql.join(` `));
	}

	ensureTables(stores, schema) {
		return Promise.resolve()
			.then(async () => {
				for(let store of stores) {
					let tableSql = new store(this._pgPool, schema).getTableSql();
					if (tableSql) {
						await this._pgPool.query(tableSql);
					}
				}
			});
	}
}

module.exports = PgDatabase;