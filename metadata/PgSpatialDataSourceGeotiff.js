const _ = require('lodash');

const PgCollection = require('../common/PgCollection');

class PgSpatialDataSourceGeotiff extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgSpatialDataSourceGeotiff');
	}

	create(objects) {
		if (!objects) throw new Error(`There is nothing to create`);

		objects = _.isArray(objects) ? objects : [objects];

		if (!objects.length) throw new Error(`There is nothing to create`);

		let promises = [];
		objects.forEach((object) => {
			let uuid = object.uuid;
			let data = object.data;

			let keys = Object.keys(data);
			let columns = _.map(keys, (key) => {
				return `"${key}"`;
			});
			let values = _.map(keys, (key) => {
				return _.isNumber(data[key]) ? data[key] : `'${data[key]}'`;
			});

			promises.push(
				this._pool.query(`INSERT INTO "${this._schema}"."${PgSpatialDataSourceGeotiff.tableName()}" (${columns.join(', ')}) VALUES (${values.join(', ')}) RETURNING id;`)
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
		pagingQuery.push(`FROM "${this._schema}"."${PgSpatialDataSourceGeotiff.tableName()}" AS a`);

		let query = [];
		query.push(`SELECT *`);
		query.push(`FROM "${this._schema}"."${PgSpatialDataSourceGeotiff.tableName()}" AS a`);

		if (keys.length || like || any) {
			let where = [];
			keys.forEach((key) => {
				where.push(`${key === "id" ? '"a".' : ''}"${key}" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
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
					let data = row;
					delete data['id'];

					return {
						id: id,
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
					this._pool.query(`UPDATE "${this._schema}"."${PgSpatialDataSourceGeotiff.tableName()}" SET ${sets.join(', ')} WHERE id = ${id}`)
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
				this._pool.query(`DELETE FROM "${this._schema}"."${PgSpatialDataSourceGeotiff.tableName()}" WHERE id = ${Number(id)};`)
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
		return `spatial_data_source_geotiff`;
	}

	static type() {
		return `geotiff`;
	}
}

module.exports = PgSpatialDataSourceGeotiff;