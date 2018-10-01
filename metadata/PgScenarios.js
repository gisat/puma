const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScenarioScenarioCaseRelations = require('./PgScenarioScenarioCaseRelations');
const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');

class PgScenarios extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, null, 'PgScenarios');

		this._pgScenarioScenarioCaseRelations = new PgScenarioScenarioCaseRelations(pgPool, pgSchema);
		this._pgPermissions = new PgPermissions(pgPool, pgSchema);
	}

	create(payloadData, user, extra) {
		let scenarios = payloadData['scenarios'];

		if (scenarios) {
			let promises = [];
			scenarios.forEach((object) => {
				if (object.id && !object.data) {
					promises.push({id: object.id, uuid: object.uuid});
				} else if (!object.id && object.data) {
					promises.push(this.createOne(object, payloadData, user));
				}
			});

			return Promise.all(promises)
				.then((results) => {
					if (results && results.length) {
						payloadData['scenarios'] = results;
						return results;
					}
				});
		}
	}

	createOne(object, payloadData, user) {
		console.log(`#### user.id`, user.id);
		let uuid = object.uuid;
		let data = object.data;

		let scenario_cases = payloadData['scenario_cases'];

		let scenarioCaseIds;
		if (data.hasOwnProperty('scenario_case_ids')) {
			scenarioCaseIds = data['scenario_case_ids'];
			delete data['scenario_case_ids'];
		}

		let keys = Object.keys(data);
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return data[key];
		});

		return this._pool
			.query(
				`INSERT INTO "${this._schema}"."${PgScenarios.tableName()}" (${columns.join(', ')}) VALUES (${_.map(values, (value, index) => {
					return `$${index + 1}`
				}).join(', ')}) RETURNING id;`,
				values
			)
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0].id;
				}
			})
			.then((id) => {
				let promises = [];

				promises.push(this._pgPermissions.add(user.id, PgScenarios.tableName(), id, Permission.CREATE));
				promises.push(this._pgPermissions.add(user.id, PgScenarios.tableName(), id, Permission.READ));
				promises.push(this._pgPermissions.add(user.id, PgScenarios.tableName(), id, Permission.UPDATE));
				promises.push(this._pgPermissions.add(user.id, PgScenarios.tableName(), id, Permission.DELETE));

				return Promise.all(promises)
					.then(() => {
						return id;
					})
			})
			.then((id) => {
				return Promise.resolve()
					.then(() => {
						let promises = [];
						if (id && scenarioCaseIds) {
							scenarioCaseIds.forEach((scenarioCaseId) => {
								promises.push(
									Promise.resolve()
										.then(() => {
											if (_.isString(scenarioCaseId)) {
												if (scenario_cases) {
													let scenario_case = _.find(scenario_cases, {uuid: scenarioCaseId});
													if (scenario_case && !scenario_case.id) {
														return this._pgScenarioCases.create(payloadData)
															.then((results) => {
																if (results.length) {
																	scenario_case.id = results[0].id;
																	return results[0].id;
																}
															});
													} else if (scenario_case) {
														return scenario_case.id;
													}
												}
											} else {
												return scenarioCaseId;
											}
										})
										.then((validScenarioCaseId) => {
											if (validScenarioCaseId) {
												return this._pgScenarioScenarioCaseRelations.create({
													data: {
														scenario_case_id: validScenarioCaseId,
														scenario_id: id
													}
												});
											}
										})
								);
							});
						}
						return Promise.all(promises);
					})
					.then(() => {
						return {
							id: id,
							uuid: uuid
						};
					});
			});
	}

	setFullRightsForOwner(resourceId, ownerId) {

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
		pagingQuery.push(`FROM "${this._schema}"."${PgScenarios.tableName()}" AS a`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" AS b ON "a"."id" = "b"."scenario_id"`);

		let query = [];
		query.push(`SELECT a.*, array_agg(b.scenario_case_id) AS scenario_case_ids`);
		query.push(`FROM "${this._schema}"."${PgScenarios.tableName()}" AS a`);
		query.push(`LEFT JOIN "${this._schema}"."${PgScenarioScenarioCaseRelations.tableName()}" AS b ON "a"."id" = "b"."scenario_id"`);

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

	update(payloadData, user) {
		let scenarios = payloadData['scenarios'];
		let scenario_cases = payloadData['scenario_cases'];

		let promises = [];
		if (scenarios) {
			scenarios.forEach((update) => {
				let id = update.id;
				let uuid = update.uuid;
				let data = update.data;

				if (data) {
					let keys = Object.keys(data);
					if (keys.length) {
						let sets = [];
						keys.forEach((key) => {
							sets.push(`"${key}" = ${_.isNumber(data[key]) ? data[key] : `'${data[key]}'`}`);
						});

						if (id) {
							promises.push(
								this._pool.query(`UPDATE "${this._schema}"."${PgScenarios.tableName()}" SET ${sets.join(', ')} WHERE id = ${id}`)
									.then((result) => {
										return {
											id: id
										}
									})
							);
						} else if (uuid) {
							promises.push(
								this.createOne(update, payloadData, user)
							);
						}
					}
				} else {
					promises.push({id: id, uuid: uuid});
				}
			});
		}

		return Promise.all(promises)
			.then((results) => {
				return {
					data: results
				}
			})
	}

	async delete(data) {
		let scenarios = data['scenarios'];
		if (scenarios) {
			let promises = [];
			for (let scenario of scenarios) {
				await this.deleteOne(scenario.id)
					.then((result) => {
						if (result.hasOwnProperty('deleted')) {
							scenario.deleted = result.deleted;
						}
						if (result.hasOwnProperty('message')) {
							scenario.message = result.message;
						}
					})
			}
		}
	}

	deleteOne(scenarioId) {
		let status = {
			deleted: false
		};
		return this._pool.query(
			`DELETE FROM "${this._schema}"."${PgScenarios.tableName()}" WHERE id = ${scenarioId}`
		).then((result) => {
			if (result.rowCount) {
				status.deleted = true;
			}
		}).then(() => {
			return this._pgScenarioScenarioCaseRelations.delete({scenario_id: scenarioId});
		}).then(() => {
			return this._pgPermissions.removeAllForResource(PgScenarios.tableName(), scenarioId);
		}).then(() => {
			return status;
		});
	}

	populateData(payloadData) {
		if (payloadData.hasOwnProperty('scenarios') && payloadData['scenarios'].length) {
			return this.get({any: {id: _.map(payloadData['scenarios'], 'id')}, unlimited: true})
				.then((currentScenarios) => {
					payloadData.scenarios = _.map(payloadData.scenarios, scenario => {
						if (scenario.id) {
							let currentScenario = _.find(currentScenarios.data, {id: scenario.id});
							if (currentScenario) {
								scenario.data = currentScenario.data;
							}
						}
						return scenario;
					});
				});
		}
	}

	setPgScenariosCasesClass(pgScenarioCases) {
		this._pgScenarioCases = pgScenarioCases;
	}

	static tableName() {
		return `scenario`;
	}
}

module.exports = PgScenarios;