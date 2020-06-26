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
						data[value] = rawData.properties[property];
					})

					data.stav = "CREATED";
					data.geometry = rawData.geometry;

					return data;
				})
			})
	}

	createLpisCheckInternalCases(data, options) {
		return Promise
			.all(
				_.map(data, (caseData) => {
					return this.createLpisCheckInternalCase(caseData, options);
				})
			)
	}

	createLpisCheckInternalCase(data, options) {
		let columns = [], values = [];

		_.each(data, (value, property) => {
			columns.push(`"${property}"`);

			if(property === "geometry") {
				values.push(`ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(value)}'), ${options.sourceEpsg})`);
			} else {
				values.push(`'${value}'`);
			}
		})

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
				return this.setPerissionsForLpisCheckInternalCase(pgQueryResult.rows[0].key);
			})
	}

	setPerissionsForLpisCheckInternalCase(caseKey) {
		return this
			._pgPool
			.query(
				`INSERT INTO "${config.pgSchema.data}"."group_permissions"`
				+ ` ("group_id", "resource_id", "resource_type", "permission")`
				+ ` VALUES`
				+ ` (2147000000, '${caseKey}', '${PgLpisCheckInternalCases.tableName()}', 'GET')`
				+ ` ,(2147000000, '${caseKey}', '${PgLpisCheckInternalCases.tableName()}', 'PUT')`
				+ ` ,(2147000001, '${caseKey}', '${PgLpisCheckInternalCases.tableName()}', 'GET')`
				+ ` ,(2147000001, '${caseKey}', '${PgLpisCheckInternalCases.tableName()}', 'PUT')`
				+ ` ,(2147000001, '${caseKey}', '${PgLpisCheckInternalCases.tableName()}', 'DELETE')`
			);
	}
}

module.exports = LpisCheckInternalImporter;