const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');
const SzifCaseCreator = require('../integration/SzifCaseCreator');
const MongoLocations = require('../metadata/MongoLocations');
const PgLpisCasePlaceRelations = require('./PgLpisCasePlaceRelations');
const PgLpisCaseViewRelations = require('./PgLpisCaseViewRelations');

class PgLpisCaseChanges extends PgCollection {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo, 'PgLpisCaseChanges');

		this._pgPermissions = new PgPermissions(pgPool, pgSchema);
	}

	create(payloadData, user, extra) {
		let objects = payloadData['lpis_case_changes'];

		if (objects) {
			let promises = [];
			objects.forEach((object) => {
				if (object.id) {
					promises.push({id: object.id});
				} else {
					promises.push(this.createOne(object, payloadData, user, extra));
				}
			});

			return Promise.all(promises)
				.then((results) => {
					payloadData['lpis_case_changes'] = results;
					return results;
				});
		}
	}

	createOne(object, payloadData, user, extra) {
		let uuid = object.uuid;
		let data = object.data;

		if (!data['date']) {
			data['date'] = new Date().toISOString();
		}

		let keys = Object.keys(data);
		let columns, values;

		columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		values = _.map(keys, (key) => {
			return data[key];
		});

		return this._pgPool.query(
			`INSERT INTO "${this._pgSchema}"."${PgLpisCaseChanges.tableName()}" (${columns.join(', ')}) VALUES (${_.map(values, (value, index) => {
				return `$${index + 1}`;
			}).join(', ')}) RETURNING id;`,
			values
		).then((queryResult) => {
			if (queryResult.rowCount) {
				return queryResult.rows[0].id;
			}
		}).then((id) => {
			return {
				id: id,
				uuid: uuid
			};
		})
	}

	populateData(payloadData) {
		if (payloadData.hasOwnProperty('lpis_case_changes') && payloadData['lpis_case_changes'].length) {
			return this.get({any: {id: _.map(payloadData['lpis_case_changes'], 'id')}, unlimited: true})
				.then((currentResults) => {
					payloadData['lpis_case_changes'] = _.map(payloadData['lpis_case_changes'], record => {
						if (record.id) {
							let currentResult = _.find(currentResults.data, {id: record.id});
							if (currentResult) {
								record.data = currentResult.data;
							}
						}
						return record;
					});
				});
		}
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
		pagingQuery.push(`FROM "${this._pgSchema}"."${PgLpisCaseChanges.tableName()}" AS a`);

		let query = [];
		query.push(`SELECT *`);
		query.push(`FROM "${this._pgSchema}"."${PgLpisCaseChanges.tableName()}" AS a`);

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

		query.push(`GROUP BY "a"."id"`);
		query.push(`ORDER BY "a"."id"`);
		if (!unlimited) {
			query.push(`LIMIT ${limit} OFFSET ${offset}`);

			payload.limit = limit;
			payload.offset = offset;
			payload.total = null;
		}

		query.push(`;`);
		pagingQuery.push(`;`);

		return this._pgPool.query(pagingQuery.join(' '))
			.then((pagingResult) => {
				if (payload.hasOwnProperty('total')) {
					payload.total = Number(pagingResult.rows[0].total);
				}
				return this._pgPool.query(query.join(' '))
			})
			.then((queryResult) => {
				return queryResult.rows;
			})
			.then((results) => {
				payload.data = _.map(results, (result) => {
					let object = {
						id: result.id,
						data: result,
					};
					delete object.data['id'];
					return object;
				});
			})
			.then(() => {
				return payload;
			})
	}

	async delete(data) {
		let lpisCases = data['lpis_case_changes'];
		if (lpisCases) {
			let promises = [];
			for (let lpisCase of lpisCases) {
				await this.deleteOne(lpisCase.id)
					.then((result) => {
						if (result.hasOwnProperty('deleted')) {
							lpisCase.deleted = result.deleted;
						}
						if (result.hasOwnProperty('message')) {
							lpisCase.message = result.message;
						}
					})
			}
		}
	}

	deleteOne(lpisCaseId) {
		let status = {
			deleted: false
		};
		return this._pgPool.query(
			`DELETE FROM "${this._pgSchema}"."${PgLpisCaseChanges.tableName()}" WHERE id = ${lpisCaseId}`
		).then((result) => {
			if (result.rowCount) {
				status.deleted = true;
			}
		}).then(() => {
			return this._pgPermissions.removeAllForResource(PgLpisCaseChanges.tableName(), lpisCaseId);
		}).then(() => {
			return status;
		});
	}

	static tableName() {
		return `lpis_case_change`;
	}
}

module.exports = PgLpisCaseChanges;