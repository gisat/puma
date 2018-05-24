const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgSpatialTypes = require('../metadata/PgSpatialTypes');
const PgSpatialDataSourceShapefile = require('./PgSpatialDataSourceShapefile');
const PgSpatialDataSourceGeotiff = require('./PgSpatialDataSourceGeotiff');

class PgSpatialDataSources extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgSpatialDataSources');

		this._pgSpatialTypes = new PgSpatialTypes(pgPool, pgSchema);
		this._pgSpatialDataSourceShapefile = new PgSpatialDataSourceShapefile(pgPool, pgSchema);
		this._pgSpatialDataSourceGeotiff = new PgSpatialDataSourceGeotiff(pgPool, pgSchema);

		this._availableTypes = {
			[PgSpatialDataSourceShapefile.type()]: this._pgSpatialDataSourceShapefile,
			[PgSpatialDataSourceGeotiff.type()]: this._pgSpatialDataSourceGeotiff
		}
	}

	create(objects) {
		if (!objects) throw new Error(`There is nothing to create`);

		objects = _.isArray(objects) ? objects : [objects];

		if (!objects.length) throw new Error(`There is nothing to create`);

		let promises = [];
		objects.forEach((object) => {
			let uuid = object.uuid;
			let type = object.type;
			let data = object.data;

			let validType = false;
			if (Object.keys(this._availableTypes).includes(type)) {
				validType = true;
			}

			if (!validType) {
				return;
			}

			promises.push(
				this._pgSpatialTypes.get({name: type, unlimited: true})
					.then((payload) => {
						if(payload.data.length) {
							return payload.data[0].id;
						} else {
							return this._pgSpatialTypes.create({data: {name: type}})
								.then((rows) => {
									return rows[0].id;
								});
						}
					})
					.then((type_id) => {
						return this._availableTypes[type].create({data: data})
							.then((rows) => {
								return rows[0].id;
							})
							.then((layer_id) => {
								return this._pool.query(`INSERT INTO "${this._schema}"."${PgSpatialDataSources.tableName()}" (type_id, layer_id) VALUES (${type_id}, ${layer_id}) RETURNING id;`)
									.then((queryResult) => {
										if (queryResult.rowCount) {
											return queryResult.rows[0].id;
										}
									})
									.then((id) => {
										return this.get({id: id, unlimited: true})
											.then((payload) => {
												let id = payload.data[0].id;
												delete payload.data[0].id;

												return {
													uuid: uuid,
													id: id,
													data: payload.data[0].data
												}
											});
									})
							});
					})
			);
		});

		return Promise.all(promises);
	}

	get(filter) {
		let payload = {
			data: null,
		};

		let limit = 100;
		if (filter.hasOwnProperty('limit')) {
			limit = filter['limit'] ? filter['limit'] : limit;
			delete filter['limit'];
		}

		let offset = 0;
		if (filter.hasOwnProperty('offset')) {
			offset = filter['offset'] ? filter['offset'] : offset;
			delete filter['offset'];
		}

		let like;
		if (filter.hasOwnProperty('like')) {
			like = filter['like'];
			delete filter['like'];
		}

		let any;
		if (filter.hasOwnProperty('any')) {
			any = filter['any'];
			delete filter['any'];
		}

		let unlimited;
		if (filter.hasOwnProperty('unlimited')) {
			unlimited = filter.unlimited;
			delete filter['unlimited'];
		}

		let keys = filter ? Object.keys(filter) : [];

		let pagingQuery = [];
		pagingQuery.push(`SELECT COUNT(*) AS total`);
		pagingQuery.push(`FROM "${this._schema}"."${PgSpatialDataSources.tableName()}" AS a`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgSpatialTypes.tableName()}" AS b ON "b"."id" = "a"."type_id"`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgSpatialDataSourceShapefile.tableName()}" AS c ON "b"."name" = '${PgSpatialDataSourceShapefile.type()}' AND "c"."id" = "a"."layer_id"`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgSpatialDataSourceGeotiff.tableName()}" AS d ON "b"."name" = '${PgSpatialDataSourceGeotiff.type()}' AND "d"."id" = "a"."layer_id"`);

		let query = [];
		query.push(`SELECT`);
		query.push(`"a"."id" AS id, "b"."name" AS type,`);
		query.push(`"c"."layer_name" AS shapefile_layer_name,`);
		query.push(`"c"."table_name" AS shapefile_table_name,`);
		query.push(`"d"."layer_name" AS geotiff_layer_name,`);
		query.push(`"d"."table_name" AS geotiff_table_name`);
		query.push(`FROM "${this._schema}"."${PgSpatialDataSources.tableName()}" AS a`);
		query.push(`LEFT JOIN "${this._schema}"."${PgSpatialTypes.tableName()}" AS b ON "b"."id" = "a"."type_id"`);
		query.push(`LEFT JOIN "${this._schema}"."${PgSpatialDataSourceShapefile.tableName()}" AS c ON "b"."name" = '${PgSpatialDataSourceShapefile.type()}' AND "c"."id" = "a"."layer_id"`);
		query.push(`LEFT JOIN "${this._schema}"."${PgSpatialDataSourceGeotiff.tableName()}" AS d ON "b"."name" = '${PgSpatialDataSourceGeotiff.type()}' AND "d"."id" = "a"."layer_id"`);

		if (keys.length || like || any) {
			let where = [];
			keys.forEach((key) => {
				let column = key;

				if (column === "id") {
					where.push(`"a"."id" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
				} else if (column === "type") {
					where.push(`"b"."name" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
				} else if (column === "layer_name") {
					where.push(`(
						"c"."layer_name" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`} 
						OR 
						"d"."layer_name" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}
					)`);
				} else if (column === "table_name") {
					where.push(`(
						"c"."table_name" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`} 
						OR 
						"d"."table_name" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}
					)`);
				}
			});

			if (like) {
				Object.keys(like).forEach((key) => {
					where.push(`"${key}" ILIKE '%${like[key]}%'`);
				});
			}

			if (any) {
				Object.keys(any).forEach((key) => {
					where.push(`${key === 'id' ? `"a"."id"` : `"${key}"`} IN (${any[key].join(', ')})`);
				});
			}

			query.push(`WHERE ${where.join(' AND ')}`);
			pagingQuery.push(`WHERE ${where.join(' AND ')}`);
		}

		query.push(`ORDER BY "a"."id"`);
		if (!unlimited) {
			query.push(`LIMIT ${limit} OFFSET ${offset}`);

			payload.limit = limit;
			payload.offset = offset;
			payload.total = null;
		}

		query.push(`;`);
		pagingQuery.push(`;`);

		return this._pool.query(pagingQuery.join(' '))
			.then((pagingResult) => {
				if (payload.hasOwnProperty('total')) {
					payload.total = Number(pagingResult.rows[0].total);
				}
				return this._pool.query(query.join(' '))
			})
			.then((queryResult) => {
				return queryResult.rows;
			})
			.then((rows) => {
				payload.data = _.map(rows, (row) => {
					let id = row.id;
					let type = row.type;
					let data = row;

					delete data['id'];
					delete data['type'];

					if (data.hasOwnProperty('shapefile_layer_name')) {
						if (data['shapefile_layer_name']) {
							data['layer_name'] = data['shapefile_layer_name'];
						}
						delete data['shapefile_layer_name'];
					}

					if (data.hasOwnProperty('shapefile_table_name')) {
						if (data['shapefile_table_name']) {
							data['table_name'] = data['shapefile_table_name'];
						}
						delete data['shapefile_table_name'];
					}

					if (data.hasOwnProperty('geotiff_layer_name')) {
						if (data['geotiff_layer_name']) {
							data['layer_name'] = data['geotiff_layer_name'];
						}
						delete data['geotiff_layer_name'];
					}

					if (data.hasOwnProperty('geotiff_table_name')) {
						if (data['geotiff_table_name']) {
							data['table_name'] = data['geotiff_table_name'];
						}
						delete data['geotiff_table_name'];
					}

					return {
						id: id,
						type: type,
						data: data
					}
				});
				return payload;
			});
	}

	update(updates) {
		let promises = [];
		updates.forEach((record) => {
			let id = record.id;
			let data = record.data;

			let keys = Object.keys(data);
			if (keys.length) {
				let sets = [];
				keys.forEach((key) => {
					sets.push(`"${key}" = ${_.isNumber(data[key]) ? data[key] : `'${data[key]}'`}`);
				});

				promises.push(
					this._pool.query(`UPDATE "${this._schema}"."${PgSpatialDataSources.tableName()}" SET ${sets.join(', ')} WHERE id = ${id}`)
						.then((result) => {
							if (result.rowCount) {
								return this.get({id: id, unlimited: true});
							}
						})
						.then((updatedResults) => {
							if (updatedResults) {
								let data = updatedResults.data[0].data;
								delete data['id'];

								return {
									id: id,
									data: data
								}
							}
						})
				);
			}
		});

		return Promise.all(promises)
			.then((results) => {
				return {
					data: results
				}
			})
	}

	delete(id) {
		return new Promise((resolve, reject) => {
			id = Number(id);
			if (!_.isNaN(id)) {
				this._pool.query(`DELETE FROM "${this._schema}"."${PgSpatialDataSources.tableName()}" WHERE id = ${Number(id)};`)
					.then((result) => {
						if (result.rowCount) {
							resolve();
						} else {
							reject(new Error(`Unable to delete record with ID ${id}`));
						}
					});
			} else {
				reject(new Error(`Given ID has not numeric value!`));
			}
		});
	}

	static tableName() {
		return `spatial_data_source`;
	}
}

module.exports = PgSpatialDataSources;