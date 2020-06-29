const childProcess = require('child_process');

const LpisCheckInternalCases = require('../specific/PgLpisCheckInternalCases');

const config = require('../config');
const { v4: uuid } = require('uuid');
const fse = require('fs-extra');

class LpisCheckInternalExporter {
	constructor(pgPool) {
		this._pgPool = pgPool;
	}

	export(request, response) {
		let temporaryName = uuid();
		let params = {
			...request.body,
			temporaryName
		};

		let exportedFilePath = this.exportTempFile(params);

		try {
			response.status(200).send(this.readTempFile(params));
		} catch (e) {
			response.status(500).send({success: false, message: e.message});
		}
	}

	exportTempFile(params, type) {
		let columns = [];

		_.each(params.columns, (value, property) => {
			columns.push(
				`\\"${property}\\" AS \\"${value}\\"`
			)
		});

		let format = "GeoJSON";
		let extension = "json";
		if(type === "shp") {
			format = "ESRI Shapefile";
			extension = "shp"
		}

		let geometryColumn = `\\"${params.geometryColumnName}\\" AS \\"the_geom\\"`;
		if(params.outputProj4) {
			geometryColumn = `ST_Transform(\\"${params.geometryColumnName}\\", '${params.outputProj4}') AS \\"the_geom\\"`;
		}

		if(params.outputEpsg) {
			geometryColumn = `ST_Transform(\\"${params.geometryColumnName}\\", ${params.outputProj4}) AS \\"the_geom\\"`;
		}

		let ogrCommand = `ogr2ogr -f ${format} /tmp/${params.temporaryName}.${extension}`
			+ ` "PG:host=${config.pgDataHost} dbname=${config.pgDataDatabase} user=${config.pgDataUser} password=${config.pgDataPassword}"`
			+ ` -sql "SELECT ${columns.join(', ')}, ${geometryColumn} FROM \\"${config.pgSchema.specific}\\".\\"${LpisCheckInternalCases.tableName()}\\" AS lc WHERE lc.status != 'CREATED'"""`;

		console.log(ogrCommand);

		childProcess.execSync(ogrCommand);
	}

	readTempFile(params) {
		if(params.type === "shp") {
			throw new Error('not implemented');
		} else {
			return this.readTempJsonFile(params)
		}
	}

	readTempJsonFile(params) {
		return fse.readJsonSync(`/tmp/${params.temporaryName}.json`);
	}
}

module.exports = LpisCheckInternalExporter;