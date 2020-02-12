const _ = require(`lodash`);
const bcrypt = require(`bcrypt`);

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
const PgStyles = require('../metadata/PgStyles');

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
const PgGroups = require(`../user/PgGroups`);

const PgEsponFuoreIndicators = require(`../specific/PgEsponFuoreIndicators`);
const PgLpisChangeCases = require(`../specific/PgLpisChangeCases`);

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
					PgTags,
					PgStyles
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
					PgUsers,
					PgGroups
				]
			},
			{
				group: `specific`,
				schema: config.pgSchema.specific,
				stores: [
					PgEsponFuoreIndicators,
					PgLpisChangeCases
				]
			}
		];

		this._variousTables = [
			`CREATE TABLE IF NOT EXISTS ${config.pgSchema.various}.attachments (
				"key" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
				"originalName" TEXT,
				"localPath" TEXT,
				"mimeType" TEXT,
				"relatedResourceKey" TEXT,
				"description" TEXT,
				"created" TIMESTAMP
			)`
		];

		this._legacyTables = [
			`CREATE TABLE IF NOT EXISTS ${config.pgSchema.data}.permissions (
				 id SERIAL PRIMARY KEY,
				 user_id int NOT NULL,
				 resource_id TEXT,
				 resource_type varchar(20),
				 permission varchar(20)
			)`,
			`CREATE TABLE IF NOT EXISTS ${config.pgSchema.data}.group_permissions (
				 id SERIAL PRIMARY KEY,
				 group_id int NOT NULL,
				 resource_id TEXT,
				 resource_type varchar(20),
				 permission varchar(20)
			)`,
			`CREATE TABLE IF NOT EXISTS ${config.pgSchema.data}.groups (
				id SERIAL PRIMARY KEY,
				name text,
				created timestamp,
				created_by int, 
				changed timestamp, 
				changed_by int
			)`,
			`CREATE TABLE IF NOT EXISTS ${config.pgSchema.data}.group_has_members (
				id SERIAL PRIMARY KEY,
				group_id int NOT NULL,
				user_id int NOT NULL,
				created timestamp,
				created_by int, 
				changed timestamp, 
				changed_by int
			)`,
			`CREATE TABLE IF NOT EXISTS ${config.pgSchema.data}.panther_users (
				id SERIAL PRIMARY KEY, 
				email text NOT NULL,
				created timestamp,
				created_by int, 
				changed timestamp, 
				changed_by int  
			);`
		];
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

				for(let legacyTableSql of this._legacyTables) {
					await this._pgPool.query(legacyTableSql);
				}

				for(let variousTableSql of this._variousTables) {
					await this._pgPool.query(variousTableSql);
				}

				await this.ensureCustomData();
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

	async ensureCustomData() {
		if(!config.customData || !Object.keys(config.customData).length) {
			console.log(`There is no custom data to create`);
		} else {
			let queries = [];

			_.each(config.customData, (data, tableIdentifier) => {
				let tableIdentifierParts = tableIdentifier.split(`\.`);
				let tableSchema = tableIdentifierParts[0];
				let tableName = tableIdentifierParts[1];

				_.each(data, (record) => {
					let columns = [], values = [], indexes = [], index = 1;
					_.each(record, (value, column) => {
						columns.push(column);
						values.push(this.modifiyValueForInsert(value, column, tableName));
						indexes.push(`$${index++}`)
					});

					queries.push(
						{
							sql: `INSERT INTO "${tableSchema}"."${tableName}" ("${columns.join('", "')}") VALUES (${indexes.join(', ')});`,
							values
						}
					)
				})
			});

			if(queries.length) {
				for(let query of queries) {
					await this._pgPool.query(query.sql, query.values)
						.then((pgResult) => {
						})
						.catch((error) => {
							console.log(`#####`, error.message);
						})
				}
			}
		}
	}

	modifiyValueForInsert(value, column, tableName) {
		if(tableName === `panther_users` && column === `password`) {
			return bcrypt.hashSync(value, 10);
		} else {
			return value;
		}
	}
}

module.exports = PgDatabase;