const fs = require('fs');
const fse = require('fs-extra');
const _ = require('lodash');
const {v4: uuid} = require('uuid');

const config = require('../config');

const PgLpisCheckInternalCases = require('../specific/PgLpisCheckInternalCases');

class LpisCheckInternalImporter {
	constructor(pgPool) {
		this._pgPool = pgPool;
	}

	importCases(request, response) {
		let options = request.body;

		Promise
			.resolve()
			.then(() => {
				if (!fs.existsSync(options.source)) {
					throw new Error(`Source not found!`);
				}
			})
			.then(() => {
				return fse.readJSON(options.source);
			})
			.then((pSourceJson) => {
				return this.prepareLpisCheckInternalCasesDataFromRawData(pSourceJson.features, options);
			})
			.then((casesData) => {
				return this.createLpisCheckInternalCases(casesData, options);
			})
			.then((caseKeys) => {
				return this.setPermissionsForExistingLpisCheckInternalCases(caseKeys);
			})
			.then(() => {
				response.status(200).send({success: true});
			})
			.catch((error) => {
				response.status(500).send({success: false, message: error.message});
			})
	}

	prepareLpisCheckInternalCasesDataFromRawData(rawData, options) {
		return Promise
			.resolve()
			.then(() => {
				return _.map(rawData, (rawData) => {
					let data = {};

					data.key = uuid();

					_.each(options.columns, (value, property) => {
						if (rawData.properties.hasOwnProperty(property)) {
							data[value] = rawData.properties[property];
						}
					})

					data.status = data.status || "CREATED";
					data.geometry = rawData.geometry;

					return data;
				})
			})
	}

	createLpisCheckInternalCases(data, options) {
		return Promise
			.resolve()
			.then(async () => {
				let caseKeys = [];
				for (let caseData of data) {
					caseKeys.push(
						await this.createLpisCheckInternalCase(caseData, options)
					);
				}
				return caseKeys;
			})
	}

	createLpisCheckInternalCase(data, options) {
		let columns = [], values = [];

		_.each(data, (value, property) => {
			columns.push(`"${property}"`);

			if (property === "geometry") {
				values.push(`ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(value)}'), ${options.sourceEpsg})`);
			} else {
				values.push(`'${value}'`);
			}
		});

		let caseKey;
		return this
			._pgPool
			.query(
				`INSERT INTO "${config.pgSchema.specific}"."${PgLpisCheckInternalCases.tableName()}"`
				+ ` (${columns.join(', ')})`
				+ ` VALUES`
				+ ` (${values.join(', ')})`
				+ ` RETURNING key`
			)
			.then((pgQueryResult) => {
				caseKey = pgQueryResult.rows[0].key;
			})
			.then(() => {
				return this.createLpisCheckIternalChange({
					resource_type: PgLpisCheckInternalCases.tableName(),
					resource_key: caseKey,
					action: "create",
					change: JSON.stringify(data)
				});
			})
			.then(() => {
				return this
					._pgPool
					.query(`SELECT "name" FROM "${config.pgSchema.data}"."groups";`)
			})
			.then((pgResult) => {
				return _.map(pgResult.rows, "name");
			})
			.then((groupNames) => {
				if (!groupNames.includes(data.region)) {
					return this
						._pgPool
						.query(`INSERT INTO "${config.pgSchema.data}"."groups" ("name") VALUES ('${data.region}')`);
				}
			})
			.then(() => {
				return caseKey;
			})
	}

	createLpisCheckIternalChange(data) {
		let columns = [], values = [];

		_.each(data, (value, property) => {
			columns.push(`"${property}"`);
			values.push(`'${value}'`);
		})

		return this
			._pgPool
			.query(
				`INSERT INTO "${config.pgSchema.data}"."metadata_changes"`
				+ ` (${columns.join(', ')})`
				+ ` VALUES`
				+ ` (${values.join(', ')})`
			);
	}

	setPermissionsForExistingLpisCheckInternalCases(caseKeys) {
		let groups;
		return this
			._pgPool
			.query(`SELECT "id", "name" FROM "${config.pgSchema.data}"."groups"`)
			.then((pgResult) => {
				groups = pgResult.rows;
			})
			.then(() => {
				let query = [
					`SELECT "key", "region" FROM "${config.pgSchema.specific}"."${PgLpisCheckInternalCases.tableName()}"`
				];

				if (caseKeys && caseKeys.length) {
					query.push(
						`WHERE "key" IN ('${caseKeys.join("', '")}')`
					)
				}

				return this
					._pgPool
					.query(query.join(" "));
			})
			.then((pgResult) => {
				return pgResult.rows;
			})
			.then((lpisCheckInternalCases) => {
				let queries = _.map(lpisCheckInternalCases, (lpisCheckInternalCase) => {
					let regionGroup = _.find(groups, (group) => {
						return group.name === lpisCheckInternalCase.region;
					});
					let uzivateleSzifGroup = {
						id: 2147000002
					}
					let spravciSzifGroup = {
						id: 2147000003
					}
					let uzivatelGisatGroup = {
						id: 2147000000
					};
					let spravciGisatGroup = {
						id: 2147000001
					}

					let inserts = [];

					inserts.push(
						`DELETE FROM "${config.pgSchema.data}"."group_permissions" WHERE "resource_id" = '${lpisCheckInternalCase.key}'`
					)

					inserts.push(
						`INSERT INTO "${config.pgSchema.data}"."group_permissions" 
    						("group_id", "resource_id", "resource_type", "permission") 
    					VALUES 
    					    (${spravciSzifGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'GET'),
    					    (${spravciSzifGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'PUT'),
    					    (${uzivatelGisatGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'GET'),
    					    (${uzivatelGisatGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'PUT'),
    					    (${spravciGisatGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'GET'),
    					    (${spravciGisatGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'PUT')`
					)

					if (regionGroup) {
						inserts.push(
							`INSERT INTO "${config.pgSchema.data}"."group_permissions" 
    						("group_id", "resource_id", "resource_type", "permission") 
    					VALUES 
    					    (${regionGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'GET'),
    					    (${regionGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'PUT')`
						)
					} else {
						inserts.push(
							`INSERT INTO "${config.pgSchema.data}"."group_permissions" 
    						("group_id", "resource_id", "resource_type", "permission") 
    					VALUES 
    					    (${uzivateleSzifGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'GET'),
    					    (${uzivateleSzifGroup.id}, '${lpisCheckInternalCase.key}', '${PgLpisCheckInternalCases.tableName()}', 'PUT')`
						)
					}

					return inserts.join("; ");
				})

				return this
					._pgPool
					.query(queries.join("; "))
			})
	}
}

module.exports = LpisCheckInternalImporter;