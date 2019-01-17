const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScopeScenarioCaseRelations = require('./PgScopeScenarioCaseRelations');
const PgPlaceScenarioCaseRelations = require('./PgPlaceScenarioCaseRelations');
const PgScenarioScenarioCaseRelations = require('./PgScenarioScenarioCaseRelations');
const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');

class PgScenarioCases {
	constructor(pgPool, pgSchema) {
		this._pgScopeScenarioCaseRelations = new PgScopeScenarioCaseRelations(pgPool, pgSchema);
		this._pgPlaceScenarioCaseRelations = new PgPlaceScenarioCaseRelations(pgPool, pgSchema);
		this._pgScenarioScenarioCaseRelations = new PgScenarioScenarioCaseRelations(pgPool, pgSchema);
		this._pgPermissions = new PgPermissions(pgPool, pgSchema);
	}

	create(payloadData, user, extra) {
		let scenario_cases = payloadData['scenario_cases'];

		if (scenario_cases) {
			let promises = [];
			scenario_cases.forEach((object) => {
				if (object.id) {
					promises.push({id: object.id});
				} else {
					promises.push(this.createOne(object, payloadData, user, extra));
				}
			});

			return Promise.all(promises)
				.then((results) => {
					payloadData['scenario_cases'] = results;
					return results;
				});
		}
	}

	createOne(object, payloadData, user, extra) {
		let uuid = object.uuid;
		let data = object.data;

		let scenarios = payloadData['scenarios'];

		let scopeIds;
		if (data.hasOwnProperty('scope_ids')) {
			scopeIds = data['scope_ids'];
			delete data['scope_ids'];
		}

		let placeIds;
		if (data.hasOwnProperty('place_ids')) {
			placeIds = data['place_ids'];
			delete data['place_ids'];
		}

		let scenarioIds;
		if (data.hasOwnProperty('scenario_ids')) {
			scenarioIds = data['scenario_ids'];
			delete data['scenario_ids'];
		}

		let keys = Object.keys(data);
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return data[key];
		});

		return this._pgPool.query(
			`INSERT INTO "${this._pgSchema}"."${PgScenarioCases.tableName()}" (${columns.join(', ')}) VALUES (${_.map(values, (value, index) => {
				return keys[index] === 'geometry' ? `ST_GeomFromGeoJSON($${index + 1})` : `$${index + 1}`
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

				promises.push(this._pgPermissions.add(user.id, PgScenarioCases.tableName(), id, Permission.CREATE));
				promises.push(this._pgPermissions.add(user.id, PgScenarioCases.tableName(), id, Permission.READ));
				promises.push(this._pgPermissions.add(user.id, PgScenarioCases.tableName(), id, Permission.UPDATE));
				promises.push(this._pgPermissions.add(user.id, PgScenarioCases.tableName(), id, Permission.DELETE));

				return Promise.all(promises)
					.then(() => {
						return id;
					})
			})
			.then((id) => {
				return Promise.resolve()
					.then(() => {
						let promises = [];
						if (id && scenarioIds) {
							scenarioIds.forEach((scenarioId) => {
								promises.push(
									Promise.resolve()
										.then(() => {
											if (_.isString(scenarioId)) {
												if (scenarios) {
													let scenario = _.find(scenarios, {uuid: scenarioId});
													if (scenario && !scenario.id) {
														return this._pgScenarios.create(payloadData, user, extra)
															.then((results) => {
																if (results.length) {
																	scenario.id = results[0].id;
																	return results[0].id;
																}
															});
													} else if (scenario) {
														return scenario.id;
													}
												}
											} else {
												return scenarioId;
											}
										})
										.then((validScenarioId) => {
											if (validScenarioId) {
												return this._pgScenarioScenarioCaseRelations.create({
													data: {
														scenario_case_id: id,
														scenario_id: validScenarioId
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
						return Promise.resolve()
							.then(() => {
								if (id && scopeIds) {
									return this._pgScopeScenarioCaseRelations.create(_.map(scopeIds, (scopeId) => {
										return {
											data: {
												scope_id: scopeId,
												scenario_case_id: id
											}
										}
									}));
								}
							});
					}).then(() => {
						return Promise.resolve()
							.then(() => {
								if (id && placeIds) {
									return this._pgPlaceScenarioCaseRelations.create(_.map(placeIds, (placeId) => {
										return {
											data: {
												place_id: placeId,
												scenario_case_id: id
											}
										}
									}));
								}
							});
					})
					.then(() => {
						return {
							id: id,
							uuid: uuid
						};
					});
			});
	}

	populateData(payloadData) {
		if(payloadData.hasOwnProperty('scenario_cases') && payloadData['scenario_cases'].length) {
			return this.get({any: {id: _.map(payloadData['scenario_cases'], 'id')}, unlimited: true})
				.then((currentScenarioCases) => {
					payloadData.scenario_cases = _.map(payloadData.scenario_cases, scenario => {
						if (scenario.id) {
							let currentScenario = _.find(currentScenarioCases.data, {id: scenario.id});
							if (currentScenario) {
								scenario.data = currentScenario.data;
							}
						}
						return scenario;
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
		pagingQuery.push(`FROM "${this._pgSchema}"."${PgScenarioCases.tableName()}" AS cases`);
		pagingQuery.push(`LEFT JOIN "${this._pgSchema}"."${PgScopeScenarioCaseRelations.tableName()}" AS scope_relations`);
		pagingQuery.push(`ON "scope_relations"."scenario_case_id" = "cases"."id"`);
		pagingQuery.push(`LEFT JOIN "${this._pgSchema}"."${PgPlaceScenarioCaseRelations.tableName()}" AS place_relations`);
		pagingQuery.push(`ON "place_relations"."scenario_case_id" = "cases"."id"`);

		let query = [];
		query.push(`SELECT cases.id, cases.name, cases.description, ST_AsGeoJSON(cases.geometry) AS geometry, ARRAY_AGG(DISTINCT scope_relations.scope_id) AS scope_ids, ARRAY_AGG(DISTINCT place_relations.place_id) AS place_ids`);
		query.push(`FROM "${this._pgSchema}"."${PgScenarioCases.tableName()}" AS cases`);
		query.push(`LEFT JOIN "${this._pgSchema}"."${PgScopeScenarioCaseRelations.tableName()}" AS scope_relations`);
		query.push(`ON "scope_relations"."scenario_case_id" = "cases"."id"`);
		query.push(`LEFT JOIN "${this._pgSchema}"."${PgPlaceScenarioCaseRelations.tableName()}" AS place_relations`);
		query.push(`ON "place_relations"."scenario_case_id" = "cases"."id"`);

		if (keys.length || like || any) {
			let where = [];
			keys.forEach((key) => {
				where.push(`${key === "id" ? '"cases".' : ''}"${key}" = ${_.isNumber(filter[key]) ? filter[key] : `'${filter[key]}'`}`);
			});

			if (like) {
				Object.keys(like).forEach((key) => {
					where.push(`"${key}" ILIKE '%${like[key]}%'`);
				});
			}

			if (any) {
				Object.keys(any).forEach((key) => {
					where.push(`${key === 'id' ? `"cases"."id"` : `"${key}"`} IN (${any[key].join(', ')})`);
				});
			}

			query.push(`WHERE ${where.join(' AND ')}`);
			pagingQuery.push(`WHERE ${where.join(' AND ')}`);
		}

		query.push(`GROUP BY "cases"."id"`);
		query.push(`ORDER BY "cases"."id"`);
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
			.then((scenarioCases) => {
				let promises = [];
				scenarioCases.forEach((scenarioCase) => {
					promises.push(
						this._pgScenarioScenarioCaseRelations.get({scenario_case_id: scenarioCase.id, unlimited: true})
							.then((payload) => {
								scenarioCase.scenario_ids = _.map(payload.data, relation => {
									return relation.data.scenario_id;
								})
							})
					)
				});
				return Promise.all(promises)
					.then(() => {
						payload.data = _.map(scenarioCases, (scenarioCase) => {
							let id = scenarioCase.id;
							let data = scenarioCase;
							delete data['id'];

							data.scope_ids = _.remove(data.scope_ids, null);
							data.place_ids = _.remove(data.place_ids, null);

							return {
								id: id,
								data: data
							}
						});
						return payload;
					});
			});
	}

	update(payloadData, user, extra) {
		let scenario_cases = payloadData['scenario_cases'];
		let scenarios = payloadData['scenarios'];

		let promises = [];

		scenario_cases.forEach((update) => {
			let id = update.id;
			let uuid = update.uuid;
			let data = update.data;

			let scopeIds;
			if (data.hasOwnProperty('scope_ids')) {
				scopeIds = data['scope_ids'];
				delete data['scope_ids'];
			}

			let placeIds;
			if (data.hasOwnProperty('place_ids')) {
				placeIds = data['place_ids'];
				delete data['place_ids'];
			}

			let scenarioIds;
			if (data.hasOwnProperty('scenario_ids')) {
				scenarioIds = data['scenario_ids'];
				delete data['scenario_ids'];
			}

			promises.push(
				Promise.resolve()
					.then(() => {
						if (id) {
							let sets = [], values = [];
							Object.keys(data).forEach((key, index) => {
								if (key === 'geometry') {
									sets.push(`"${key}" = ST_GeomFromGeoJSON($${index + 1})`);
								} else {
									sets.push(`"${key}" = $${index + 1}`);
								}
								values.push(data[key]);
							});

							if (sets.length && sets.length === values.length) {
								return this._pgPool.query(
									`UPDATE "${this._pgSchema}"."${PgScenarioCases.tableName()}" SET ${sets.join(', ')} WHERE id = ${id};`,
									values
								);
							}
						} else if (uuid) {
							return this.createOne(update, payloadData, user, extra)
								.then((result) => {
									id = result.id;
									uuid = result.uuid;
								})
						}
					})
					.then(() => {
						if (id && (scopeIds || scopeIds === null)) {
							return this._pgScopeScenarioCaseRelations.update({
								scenario_case_id: id,
								scope_ids: scopeIds
							});
						}
					})
					.then(() => {
						if (id && (placeIds || placeIds === null)) {
							return this._pgPlaceScenarioCaseRelations.update({
								scenario_case_id: id,
								place_ids: placeIds
							});
						}
					})
					.then(() => {
						if (id && (scenarioIds || scenarioIds === null)) {
							return this._pgScenarios.update(payloadData, user, extra)
								.then((results) => {
									if(scenarios && results.data) {
										payloadData['scenarios'] = results.data;
									}
									if(scenarioIds) {
										return _.map(scenarioIds, (scenarioId) => {
											if (_.isString(scenarioId)) {
												let scenario = _.find(payloadData['scenarios'], {uuid: scenarioId});
												if (scenario) {
													return scenario.id;
												}
											} else if (_.isNumber(scenarioId)) {
												return scenarioId;
											}
										});
									} else {
										return scenarioIds;
									}
								});
						}
					})
					.then((validScenarioIds) => {
						if (id) {
							return this._pgScenarioScenarioCaseRelations.update({
								scenario_case_id: id,
								scenario_ids: validScenarioIds
							});
						}
					})
					.then(() => {
						return {
							id: id,
							uuid: uuid
						}
					})
			);
		});

		return Promise.all(promises)
			.then((results) => {
				payloadData['scenario_cases'] = results;
			});
	}

	async delete(data) {
		let scenarioCases = data['scenario_cases'];
		if(scenarioCases) {
			let promises = [];
			for(let scenarioCase of scenarioCases) {
				await this.deleteOne(scenarioCase.id)
					.then((result) => {
						if(result.hasOwnProperty('deleted')) {
							scenarioCase.deleted = result.deleted;
						}
						if(result.hasOwnProperty('message')) {
							scenarioCase.message = result.message;
						}
					})
			}
		}
	}

	deleteOne(scenarioCaseId) {
		let status = {
			deleted: false
		};
		return this._pgPool.query(
			`DELETE FROM "${this._pgSchema}"."${PgScenarioCases.tableName()}" WHERE id = ${scenarioCaseId}`
		).then((result) => {
			if(result.rowCount) {
				status.deleted = true;
			}
		}).then(() => {
			return this._pgScenarioScenarioCaseRelations.delete({scenario_case_id: scenarioCaseId});
		}).then(() => {
			return this._pgPermissions.removeAllForResource(PgScenarioCases.tableName(), scenarioCaseId);
		}).then(() => {
			return status;
		});
	}

	setPgScenariosClass(pgScenarios) {
		this._pgScenarios = pgScenarios;
	}

	static tableName() {
		return `scenario_case`;
	}
}

module.exports = PgScenarioCases;