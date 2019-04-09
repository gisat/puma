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

const PgSpatialRelations = require(`../relations/PgSpatialRelations`);
const PgAttributeRelations = require(`../relations/PgAttributeRelations`);
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

		this._metadataStores = [
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
		];

		this._relationsStores = [
			PgSpatialRelations,
			PgAttributeRelations,
			PgAreaRelations
		];

		this._dataSourcesStores = [
			PgCommonSpatialDataSource,
			PgAttributeDataSource
		];

		this._applicationStores = [
			PgLayerTrees,
			PgConfigurations,
			PgApplications
		];

		this._viewsStores = [
			PgViews
		];

		this._usersStores = [
			PgUsers
		];

		this._specificStores = [
			PgEsponFuoreIndicators
		];
	}

	ensure() {
		return this.ensureSchemas()
			.then(() => {
				return this.ensureTables(this._metadataStores, config.pgSchema.metadata);
			})
			.then(() => {
				return this.ensureTables(this._relationsStores, config.pgSchema.relations);
			})
			.then(() => {
				return this.ensureTables(this._dataSourcesStores, config.pgSchema.dataSources);
			})
			.then(() => {
				return this.ensureTables(this._applicationStores, config.pgSchema.application);
			})
			.then(() => {
				return this.ensureTables(this._viewsStores, config.pgSchema.views);
			})
			.then(() => {
				return this.ensureTables(this._usersStores, config.pgSchema.data);
			})
			.then(() => {
				return this.ensureTables(this._specificStores, config.pgSchema.specific);
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