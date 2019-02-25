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
const PgViews = require('../metadata/PgViews');

const PgSpatialRelations = require(`../metadata/PgSpatialRelations`);
const PgAttributeRelations = require(`../metadata/PgAttributeRelations`);
const PgAreaRelations = require(`../metadata/PgAreaRelations`);

const PgCommonDataSource = require(`../dataSources/PgCommonDataSource`);

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
			PgViews
		];

		this._relationsStores = [
			PgSpatialRelations,
			PgAttributeRelations,
			PgAreaRelations
		];

		this._dataSourcesStores = [
			PgCommonDataSource
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
		return Promise.all(_.map(stores, (store) => {
			let tableSql = new store(this._pgPool, schema).getTableSql();
			if (tableSql) {
				return this._pgPool.query(tableSql);
			}
		}));
	}
}

module.exports = PgDatabase;