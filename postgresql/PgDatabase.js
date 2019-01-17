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
const PgAreaTree = require('../metadata/PgAreaTree');
const PgAreaTreeLevel = require('../metadata/PgAreaTreeLevel');
const PgViews = require('../metadata/PgViews');

const PgSpatialRelations = require(`../metadata/PgSpatialRelations`);
const PgAttributeRelations = require(`../metadata/PgAttributeRelations`);
const PgAreaRelations = require(`../metadata/PgAreaRelations`);

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
			PgAreaTree,
			PgAreaTreeLevel,
			PgViews
		];

		this._relationsStores = [
			PgSpatialRelations,
			PgAttributeRelations,
			PgAreaRelations
		]
	}

	ensure() {
		return this.ensureSchemas()
			.then(() => {
				return this.ensureMetadataTables();
			})
			.then(() => {
				return this.ensureRelationsTables();
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

	ensureMetadataTables() {
		return Promise.all(_.map(this._metadataStores, (store) => {
			let tableSql = new store(this._pgPool, config.pgSchema.metadata).getTableSql();
			console.log(tableSql);
			if (tableSql) {
				return this._pgPool.query(tableSql);
			}
		}));
	}

	ensureRelationsTables() {
		return Promise.all(_.map(this._relationsStores, (store) => {
			let tableSql = new store(this._pgPool, config.pgSchema.relations).getTableSql();
			console.log(tableSql);
			if (tableSql) {
				return this._pgPool.query(tableSql);
			}
		}));
	}
}

module.exports = PgDatabase;