const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScopeScenarioCaseRelations = require('./PgScopeScenarioCaseRelations');
const PgPlaceScenarioCaseRelations = require('./PgPlaceScenarioCaseRelations');
const PgScenarioScenarioCaseRelations = require('./PgScenarioScenarioCaseRelations');

class PgScenarioCases extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgScenarioCases');

		this._pgScopeScenarioCaseRelations = new PgScopeScenarioCaseRelations(pgPool, pgSchema);
		this._pgPlaceScenarioCaseRelations = new PgPlaceScenarioCaseRelations(pgPool, pgSchema);
		this._pgScenarioScenarioCaseRelations = new PgScenarioScenarioCaseRelations(pgPool, pgSchema);
	}

	create(payloadData) {
		let scenario_cases = payloadData['scenario_cases'];

		if (scenario_cases) {
			let promises = [];
			scenario_cases.forEach((object) => {
				if (object.id) {
					promises.push({id: object.id});
				} else {
					promises.push(this._createOne(object, payloadData));
				}
			});

			return Promise.all(promises)
				.then((results) => {
					payloadData['scenario_cases'] = results;
					return results;
				});
		}
	}

	_createOne(object, payloadData) {
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

		return this._pool.query(
			`INSERT INTO "${this._schema}"."${PgScenarioCases.tableName()}" (${columns.join(', ')}) VALUES (${_.map(values, (value, index) => {return keys[index] === 'geometry' ? `ST_GeomFromGeoJSON($${index+1})` : `$${index+1}`}).join(', ')}) RETURNING id;`,
			values
		)
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0].id;
				}
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
														return this._pgScenarios.create(payloadData)
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
		pagingQuery.push(`FROM "${this._schema}"."${PgScenarioCases.tableName()}" AS cases`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgScopeScenarioCaseRelations.tableName()}" AS scope_relations`);
		pagingQuery.push(`ON "scope_relations"."scenario_case_id" = "cases"."id"`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}" AS place_relations`);
		pagingQuery.push(`ON "place_relations"."scenario_case_id" = "cases"."id"`);

		let query = [];
		query.push(`SELECT cases.id, cases.name, cases.description, ST_AsGeoJSON(cases.geometry) AS geometry, scope_relations.scope_id, place_relations.place_id`);
		query.push(`FROM "${this._schema}"."${PgScenarioCases.tableName()}" AS cases`);
		query.push(`LEFT JOIN "${this._schema}"."${PgScopeScenarioCaseRelations.tableName()}" AS scope_relations`);
		query.push(`ON "scope_relations"."scenario_case_id" = "cases"."id"`);
		query.push(`LEFT JOIN "${this._schema}"."${PgPlaceScenarioCaseRelations.tableName()}" AS place_relations`);
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

		query.push(`ORDER BY "cases"."id"`);
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
			.then((scenarioCases) => {
				let promises = [];
				scenarioCases.forEach((scenarioCase) => {
					promises.push(
						this._pgScenarios.get({scenario_case_id: scenarioCase.id, unlimited: true})
							.then((payload) => {
								scenarioCase.scenario_ids = _.map(payload.data, "id");
							})
					)
				});
				return Promise.all(promises)
					.then(() => {
						payload.data = _.map(scenarioCases, (scenarioCase) => {
							let id = scenarioCase.id;
							let data = scenarioCase;
							delete data['id'];

							return {
								id: id,
								data: data
							}
						});
						return payload;
					});
			});
	}

	update(updates) {
		updates = _.isArray(updates) ? updates : [updates];

		let promises = [];

		updates.forEach((update) => {
			let id = update.id;
			let data = update.data;

			let scopeId;
			if (data.hasOwnProperty('scope_id')) {
				scopeId = data['scope_id'];
				delete data['scope_id'];
			}

			let placeId;
			if (data.hasOwnProperty('place_id')) {
				placeId = data['place_id'];
				delete data['place_id'];
			}

			let scenarioIds;
			if (data.hasOwnProperty('scenario_ids')) {
				scenarioIds = data['scenario_ids'];
				delete data['scenario_ids'];
			}

			let scenarios;
			if (data.hasOwnProperty('scenarios')) {
				scenarios = data['scenarios'];
				delete data['scenarios'];
			}

			promises.push(
				Promise.resolve()
					.then(() => {
						let keys = Object.keys(data);
						if (keys.length) {
							let sets = [];
							keys.forEach((key) => {
								if (key === "geometry") {
									sets.push(`"${key}" = ST_GeomFromGeoJSON('${JSON.stringify(data[key])}')`);
								} else if (_.isNumber(data[key])) {
									sets.push(`"${key}" = ${data[key]}`);
								} else {
									sets.push(`"${key}" = '${data[key]}'`);
								}
							});

							return this._pool.query(`UPDATE "${this._schema}"."${PgScenarioCases.tableName()}" SET ${sets.join(', ')} WHERE id = ${id}`);
						}
					})
					.then(() => {
						if (id && (scopeId || scopeId === null)) {
							return this._pgScopeScenarioCaseRelations.update({scenario_case_id: id, scope_id: scopeId});
						}
					})
					.then(() => {
						if (id && (placeId || placeId === null)) {
							return this._pgPlaceScenarioCaseRelations.update({scenario_case_id: id, place_id: placeId});
						}
					})
					.then(() => {
						if (id && scenarioIds) {
							return this._pgScenarioScenarioCaseRelations.update({
								scenario_case_id: id,
								scenario_ids: scenarioIds
							});
						}
					})
					.then(() => {
						let create_update_promises = [];
						if (id && scenarios) {
							scenarios.forEach((scenario) => {
								if (scenario.uuid) {
									scenario.data.scenario_case_ids = [id];
									create_update_promises.push(
										this._pgScenarios.create(scenario)
											.then((createResults) => {
												return createResults[0];
											})
									)
								} else if (scenario.id) {
									create_update_promises.push(
										this._pgScenarios.update(scenario)
											.then((updateResult) => {
												return updateResult.data[0];
											})
									)
								}
							});
						}
						return Promise.all(create_update_promises)
							.then((results) => {
								scenarios = results;
							});
					})
					.then(() => {
						return this.get({id: id, unlimited: true});
					})
					.then((updatedResults) => {
						if (updatedResults) {
							let data = updatedResults.data[0].data;
							delete data['id'];

							if (scenarios) {
								data.scenarios = scenarios;
							}

							return {
								id: id,
								data: data
							}
						}
					})
			);
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
				this._pool.query(`DELETE FROM "${this._schema}"."${PgScenarioCases.tableName()}" WHERE id = ${Number(id)};`)
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

	setPgScenariosClass(pgScenarios) {
		this._pgScenarios = pgScenarios;
	}

	static tableName() {
		return `scenario_case`;
	}
}

module.exports = PgScenarioCases;