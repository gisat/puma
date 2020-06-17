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
const PgUserPermissions = require('../user/PgUserPermissions');
const PgGroupPermissions = require('../user/PgGroupPermissions');
const PgPermissions = require(`../user/PgPermissions`);
const PgUserGroups = require('../user/PgUserGroups');

const PgEsponFuoreIndicators = require(`../specific/PgEsponFuoreIndicators`);
const PgLpisChangeCases = require(`../specific/PgLpisChangeCases`);

const PgClient = require('./PgClient');
const PgPool = require('./PgPool');

class PgDatabase {
	constructor() {
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
				group: `users`,
				schema: config.pgSchema.user,
				stores: [
					PgUsers,
					PgGroups,
					PgUserGroups,
					PgPermissions,
					PgUserPermissions,
					PgGroupPermissions,
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
			)`,
			`CREATE TABLE IF NOT EXISTS "${config.pgSchema.various}"."metadataChanges" (
				  "key" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
				  "resourceType" TEXT,
				  "resourceKey" TEXT,
				  "action" TEXT,
				  "changed" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
				  "changedBy" TEXT,
				  "change" JSONB
			)`,
		    `CREATE OR REPLACE VIEW "user"."v_userPermissions" AS
			SELECT
			  "p"."resourceType", "p"."resourceKey", "p"."permission", "up"."userKey"
			FROM
			  "user"."permissions" "p"
			  JOIN "user"."userPermissions" "up" ON "up"."permissionKey" = "p"."key"
			UNION
			SELECT
			  "p"."resourceType", "p"."resourceKey", "p"."permission", "ug"."userKey"
			FROM
			  "user"."permissions" "p"
			  JOIN "user"."groupPermissions" "gp" ON "gp"."permissionKey" = "p"."key"
			  JOIN "user"."userGroups" "ug" ON "ug"."groupKey" = "gp"."groupKey"`
		];
	}

	getDataTypeStoresGroupedByType() {
		return this._dataTypes;
	}

	ensure() {
		return this
			.ensureDatabase()
			.then(() => {
				return this.ensureSchemas();
			})
			.then(() => {
				let promises = [];
				for (let dataType of this._dataTypes) {
					promises.push(
						this.ensureTables(dataType.stores, dataType.schema)
					);
				}

				return Promise.all(promises);
			})
			.then(() => {
				let promises = [];
				for (let variousTableSql of this._variousTables) {
					let pgClient = new PgClient().getClient();
					promises.push(
						pgClient
							.connect()
							.then(() => {
								return pgClient.query(variousTableSql);
							})
							.then(() => {
								pgClient.end();
							})
					)
				}

				return Promise.allSettled(promises)
			})
			.then(() => {
				return this.ensureCustomData();
			})
	}

	ensureDatabaseExtensions() {
		let pgClient = new PgClient().getClient();
		return pgClient
			.connect()
			.then(() => {
				return pgClient
					.query(`CREATE EXTENSION "postgis";`)
					.catch((error) => {
						console.log(`#WARNING#`, error.message);
					})
			})
			.then(() => {
				return pgClient
					.query(`CREATE EXTENSION "pgcrypto";`)
					.catch((error) => {
						console.log(`#WARNING#`, error.message);
					})
			})
			.then(() => {
				pgClient.end();
			})
	}

	async ensureDatabase() {
		return Promise.resolve()
			.then(() => {
				if (config.pgConfig.superuser) {
					let pgClient = new PgClient().getClient(true);
					return pgClient
						.connect()
						.then(() => {
							return pgClient.query(`CREATE ROLE "${config.pgConfig.normal.user}"`)
								.catch((error) => {
									console.log(`#WARNING#`, error.message);
								})
						})
						.then(() => {
							return pgClient.query(`ALTER ROLE "${config.pgConfig.normal.user}" PASSWORD '${config.pgConfig.normal.password}'`)
								.catch((error) => {
									console.log(`#WARNING#`, error.message);
								})
						})
						.then(() => {
							return pgClient.query(`ALTER ROLE "${config.pgConfig.normal.user}" LOGIN`)
								.catch((error) => {
									console.log(`#WARNING#`, error.message);
								})
						})
						.then(() => {
							return pgClient.query(`ALTER ROLE "${config.pgConfig.normal.user}" SUPERUSER`)
								.catch((error) => {
									console.log(`#WARNING#`, error.message);
								})
						})
						.then(() => {
							return pgClient.query(`CREATE DATABASE "panther" WITH OWNER "panther";`)
								.catch((error) => {
									console.log(`#WARNING#`, error.message);
								})
						})
						.then(() => {
							return pgClient.end();
						});
				}
			})
			.then(() => {
				return this.ensureDatabaseExtensions();
			})
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

		let pgClient = new PgClient().getClient();
		return pgClient
			.connect()
			.then(() => {
				return pgClient.query(schemasSql.join(` `))
			})
			.catch((error) => {

			})
			.then(() => {
				return pgClient.end();
			})
	}

	async ensureTables(stores, schema) {
		for (let store of stores) {
			let tableSql = new store(new PgPool().getPool(), schema).getTableSql();
			let pgClient = new PgClient().getClient();

			if (tableSql) {
				await pgClient
					.connect()
					.then(() => {
						return pgClient.query(tableSql);
					})
					.then(() => {
						pgClient.end();
					});
			}
		}
	}

	async ensureCustomData() {
		if (!config.customData || !Object.keys(config.customData).length) {
			console.log(`#NOTE# There are no custom data to create!`);
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

			if (queries.length) {
				for (let query of queries) {
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
		// if (tableName === `users` && column === `password`) {
		// 	return bcrypt.hashSync(value, 10);
		// } else {
		// 	return value;
		// }
		console.log("#WARNING# REWRITE NEEDED #21969261f2ff#")
		return value;
	}
}

module.exports = PgDatabase;