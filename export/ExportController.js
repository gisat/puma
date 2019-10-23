const exampleFilter = {
	filter: {
		applicationKey: "esponFuore",
		scopeKey: "a95d3fed-7d97-47d0-a41a-3324e5d7eae6",
		attributeKey: "64578c81-aae2-47a7-89f1-56ff5f0166de",
		periodKey: {
			in: [
				"3cf38212-a702-40ec-bf8e-4bd2466356a8",
				"2873a67e-600f-4a5d-802a-276a73d3a051"
			]
		}
	},
	features: [1, 5, 20, 31, 48, 52, 12, 3, 27]
};

const _ = require(`lodash`);
const child_process = require(`child_process`);
const uuidv4 = require(`uuid/v4`);
const fs = require(`fs`);

const PgRelationsCrud = require(`../relations/PgRelationsCrud`);
const PgMetadataCrud = require(`../metadata/PgMetadataCrud`);
const PgDataSourcesCrud = require(`../dataSources/PgDataSourcesCrud`);

const config = require(`../config`);

class ExportController {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

		this._pgRelationsCrud = new PgRelationsCrud(pgPool, config.pgSchema.relations);
		this._pgMetadataCrud = new PgMetadataCrud(pgPool, config.pgSchema.metadata);
		this._pgDataSourcesCrud = new PgDataSourcesCrud(pgPool, config.pgSchema.dataSources);

		app.post(`/rest/export/geojson/filtered`, this.exportFiltered.bind(this, `geojson`));
		app.post(`/rest/export/shp/filtered`, this.exportFiltered.bind(this, `shp`));
	}

	getColumNamesForTableName(tableName) {
		return this._pgPool
			.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}'`)
			.then((pgResult) => {
				return _.map(pgResult.rows, `column_name`);
			});
	}

	getGeometryColumnsForTableName(tableName) {
		return this.getColumNamesForTableName(tableName)
			.then((columnNames) => {
				return this._pgPool
					.query(`SELECT ${_.map(columnNames, (columnName) => {
						return `pg_typeof("${columnName}") AS "${columnName}"`
					}).join(', ')} FROM "${tableName}" LIMIT 1`)
					.then((pgResult) => {
						return _.compact(_.map(pgResult.rows[0], (type, columName) => {
							if (type === `geometry`) {
								return columName;
							}
						}));
					});
			});
	}

	exportFiltered(type, request, response) {
		let filter = request.body.filter;
		let features = request.body.features;
		let user = request.session.user;

		Promise.resolve()
			.then(async () => {
				if (filter.scopeKey && filter.attributeKey && filter.periodKey) {
					let scope = await this._pgMetadataCrud.get(
						`scopes`,
						{
							filter: {
								key: filter.scopeKey
							}
						},
						user
					).then((getResult) => {
						return getResult.data.scopes[0];
					});

					if (!scope) {
						throw new Error(`Unable to find scope with key ${filter.scopeKey}`);
					}

					let relationsPeriodRelated = await this._pgRelationsCrud.get(
						`attribute`,
						{
							filter: {
								scopeKey: filter.scopeKey,
								attributeKey: {
									in: [filter.attributeKey, scope.data.configuration.areaNameAttributeKey, scope.data.configuration.countryCodeAttributeKey]
								},
								periodKey: {
									in: filter.periodKey.in
								}
							}
						},
						user
					).then((getResult) => {
						return getResult.data.attribute;
					});

					let relationsCommon = await this._pgRelationsCrud.get(
						`attribute`,
						{
							filter: {
								scopeKey: filter.scopeKey,
								attributeKey: {
									in: [filter.attributeKey, scope.data.configuration.areaNameAttributeKey, scope.data.configuration.countryCodeAttributeKey]
								},
								periodKey: null
							}
						},
						user
					).then((getResult) => {
						return getResult.data.attribute;
					});

					if (!relationsPeriodRelated.length || !relationsCommon.length) {
						throw new Error(`Unable to find any relations!`);
					}

					let relations = _.concat(relationsPeriodRelated, relationsCommon);

					let attributeDataSources = await this._pgDataSourcesCrud.get(
						`attribute`,
						{
							filter: {
								key: {
									in: _.map(relations, (relation) => {
										return relation.data.attributeDataSourceKey
									})
								}
							}
						},
						user
					).then((getResult) => {
						return getResult.data.attribute;
					});

					let tables = {};

					_.each(attributeDataSources, (attributeDataSource) => {
						if (!tables.hasOwnProperty(attributeDataSource.data.tableName)) {
							tables[attributeDataSource.data.tableName] = {};
						}

						tables[attributeDataSource.data.tableName].dataColumns = tables[attributeDataSource.data.tableName].dataColumns || [];
						tables[attributeDataSource.data.tableName].dataColumns.push(attributeDataSource.data.columnName);

						let ownRelations = _.filter(relations, (relation) => {
							return relation.data.attributeDataSourceKey === attributeDataSource.key;
						});

						tables[attributeDataSource.data.tableName].fidColumns = tables[attributeDataSource.data.tableName].fidColumns || [];
						tables[attributeDataSource.data.tableName].fidColumns = _.uniq(_.concat(tables[attributeDataSource.data.tableName].fidColumns, _.map(ownRelations, (ownRelation) => {
							return ownRelation.data.fidColumnName;
						})));
					});

					for (let table of Object.keys(tables)) {
						await this.getGeometryColumnsForTableName(table)
							.then((geometryColumnsForTable) => {
								tables[table].geometryColumns = tables[table].geometryColumns || [];
								tables[table].geometryColumns = _.uniq(_.concat(tables[table].geometryColumns, geometryColumnsForTable));
							})
					}

					let query = [];
					let joins = [];
					let where = [];
					let columns = [];

					_.each(tables, (data, tableName) => {
						_.each(data.dataColumns, (dataColumn) => {
							if(tableName.includes(`au_`)) {
								columns.push(`"au"."${dataColumn}"`)
							} else {
								columns.push(`"${dataColumn}"`);
							}
						});

						_.each(data.geometryColumns, (dataColumn) => {
							if(tableName.includes(`au_`)) {
								columns.push(`"au"."${dataColumn}"`)
							} else {
								columns.push(`"${dataColumn}"`);
							}
						})
					});

					_.each(tables, (data, tableName) => {
						if(tableName.includes(`au_`)) {
							query.push(`SELECT ${columns.join(`, `)} FROM "${tableName}" AS "au"`);
						} else {
							joins.push(`LEFT JOIN "${tableName}" AS "${tableName}" ON "${tableName}"."${data.fidColumns[0]}" = au."${data.fidColumns[0]}"`);
						}
					});

					where.push(`"au"."objectid" IN (${features.join(`, `)})`);

					query.push(joins.join(` `));
					query.push(`WHERE ${where.join(` `)}`);

					let outputName = `export_output_${uuidv4()}`;

					if(type === `geojson`) {
						child_process.execSync(`ogr2ogr -f GeoJSON ${outputName}.geojson "PG:host=localhost dbname=geonode_data user=geonode password=geonode" -sql '${query.join(` `)}'`);

						response.setHeader('Content-Type', 'application/octet-stream');
						response.send(fs.readFileSync(`${outputName}.geojson`));
					} else if(type === `shp`) {
						child_process.execSync(`ogr2ogr -f 'ESRI Shapefile' ${outputName}.shp "PG:host=localhost dbname=geonode_data user=geonode password=geonode" -sql '${query.join(` `)}'`);

						child_process.execSync(`zip ${outputName}.zip ${outputName}.*`);

						response.setHeader('Content-Type', 'application/octet-stream');
						response.send(fs.readFileSync(`${outputName}.zip`));
					}

					child_process.execSync(`rm -rf ${outputName}.*`);

				} else {
					throw new Error(`wrong filter`);
				}

			})
			.then(() => {
				response.send();
			})
			.catch((error) => {
				response.status(400).send({error: error.message});
			});
	}
}

module.exports = ExportController;