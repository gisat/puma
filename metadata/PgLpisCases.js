const _ = require('lodash');
const turf = require('@turf/turf');

const PgCollection = require('../common/PgCollection');
const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');
const SzifCaseCreator = require('../integration/SzifCaseCreator');
const MongoLocations = require('../metadata/MongoLocations');
const PgLpisCasePlaceRelations = require('./PgLpisCasePlaceRelations');
const PgLpisCaseViewRelations = require('./PgLpisCaseViewRelations');
const PgLpisCaseChanges = require('./PgLpisCaseChanges');
const MongoDataViews = require('../visualization/MongoDataViews');

class PgLpisCases extends PgCollection {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo, 'PgLpisCases');

		this._mongo = mongo;

		this._pgPermissions = new PgPermissions(pgPool, pgSchema);
		this._szifCaseCreator = new SzifCaseCreator(pgPool, mongo);
		this._pgLpisCasePlaceRelations = new PgLpisCasePlaceRelations(pgPool, pgSchema, mongo);
		this._pgLpisCaseViewRelations = new PgLpisCaseViewRelations(pgPool, pgSchema, mongo);
		this._pgLpisCaseChanges = new PgLpisCaseChanges(pgPool, pgSchema)
		this._mongoDataViews = new MongoDataViews(mongo);
	}

	create(payloadData, user, extra) {
		let objects = payloadData['lpis_cases'];

		if (objects) {
			let promises = [];
			objects.forEach((object) => {
				if (object.id) {
					promises.push({id: object.id});
				} else {
					promises.push(this._createOne(object, payloadData, user, extra));
				}
			});

			return Promise.all(promises)
				.then((results) => {
					payloadData['lpis_cases'] = results;
					return results;
				});
		}
	}

	_createOne(object, payloadData, user, extra) {
		let uuid = object.uuid;
		let data = object.data;
		let status = object.status;

		let keys = Object.keys(data);
		let columns, values;

		return Promise.resolve()
			.then(() => {
				if (!status) {
					throw new Error(`status not specified`);
				}
			})
			.then(() => {
				return this._updateGeometriesByFiles(keys, data, extra.files)
			})
			.then(() => {
				columns = _.map(keys, (key) => {
					return `"${key}"`;
				});
				values = _.map(keys, (key) => {
					return data[key];
				});
			})
			.then(() => {
				return this._pool.query(
					`INSERT INTO "${this._schema}"."${PgLpisCases.tableName()}" (${columns.join(', ')}) VALUES (${_.map(values, (value, index) => {
						if (keys[index].toLowerCase().includes(`geometry`)) {
							return `ST_GeomFromGeoJSON($${index + 1})`;
						} else {
							return `$${index + 1}`;
						}
					}).join(', ')}) RETURNING id;`,
					values
				)
			})
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0].id;
				}
			})
			.then((lpis_case_id) => {
				return this._pgLpisCaseChanges
					.create(
						{
							lpis_case_changes: [
								{
									data: {
										changed_by: user.id,
										// lpis_case_id: ids.lpis_case_id,
										lpis_case_id: lpis_case_id,
										status: status
									}
								}
							]
						},
						user
					)
					.then(() => {
						return lpis_case_id;
					})
			})
			.then((lpis_case_id) => {
				if (extra.configuration || extra.configuration.scope_id) {
					return this._createMongoBasicDataView(extra.configuration.scope_id)
						.then((basicDataViewId) => {
							return Promise
								.all([
									this._pgPermissions.add(user.id, `dataset`, basicDataViewId, Permission.CREATE),
									this._pgPermissions.add(user.id, `dataset`, basicDataViewId, Permission.READ),
									this._pgPermissions.add(user.id, `dataset`, basicDataViewId, Permission.UPDATE),
									this._pgPermissions.add(user.id, `dataset`, basicDataViewId, Permission.DELETE)
								])
								.then(() => {
									return basicDataViewId;
								})
						})
						.then((basicDataViewId) => {
							let featureBefore = {geometry: data['geometry_before'], type: `Feature`};
							let featureAfter = {geometry: data['geometry_after'], type: `Feature`};
							let mergedFeatures = data['geometry_before'] && data['geometry_after'] ? turf.union(featureBefore, featureAfter) : featureBefore;
							let boundingBox = turf.bbox(mergedFeatures);
							let diagonalDistance = turf.distance(turf.point([boundingBox[0], boundingBox[1]]), turf.point([boundingBox[2], boundingBox[3]]));
							let centroid = turf.centroid(mergedFeatures);
							return this._mongoDataViews
								.update(
									basicDataViewId,
									{
										"conf.worldWindState": {
											"range": diagonalDistance * 1000, // set webworldwind range in meters plus buffer
											"considerElevation": true,
											"location": {
												"latitude": centroid.geometry.coordinates[1],
												"longitude": centroid.geometry.coordinates[0]
											}
										}
									})
								.then(() => {
									return basicDataViewId;
								})
						})
						.then((dataViewId) => {
							return this._pgLpisCaseViewRelations
								.create({data: {lpis_case_id: lpis_case_id, view_id: dataViewId}}, user, extra)
						})
						.then(() => {
							return lpis_case_id;
						})
				} else {
					return lpis_case_id;
				}
			})
			.then((lpis_case_id) => {
				let promises = [];

				return Promise
					.all([
						this._pgPermissions.add(user.id, PgLpisCases.tableName(), lpis_case_id, Permission.CREATE),
						this._pgPermissions.add(user.id, PgLpisCases.tableName(), lpis_case_id, Permission.READ),
						this._pgPermissions.add(user.id, PgLpisCases.tableName(), lpis_case_id, Permission.UPDATE),
						this._pgPermissions.add(user.id, PgLpisCases.tableName(), lpis_case_id, Permission.DELETE)
					])
					.then(() => {
						return lpis_case_id;
					})
			})
			.then((lpis_case_id) => {
				return {
					id: lpis_case_id,
					uuid: uuid
				};
			})
			.catch((error) => {
				return {
					uuid: uuid,
					status: `error`,
					message: error.message
				}
			})
	}

	_createMongoBasicDataView(scope_id) {
		return this._getMongoBasicDataViewParametersByScopeId(scope_id)
			.then(([theme_id, period_id]) => {
				if (!theme_id || !period_id || !scope_id) {
					throw new Error('missing id');
				}
				return this._mongoDataViews.defaultForScope(scope_id, theme_id, null, period_id);
			});
	}

	_getMongoBasicDataViewParametersByScopeId(scope_id) {
		return this._mongo
			.collection(`theme`)
			.find({dataset: scope_id})
			.toArray()
			.then((mongoResults) => {
				if (mongoResults[0]) {
					return [
						mongoResults[0]['_id'],
						mongoResults[0]['years'][0]
					];
				}
			})
	}

	_createMongoPlace(keys, data) {
		return Promise.resolve()
			.then(() => {
				let caseMetadata = {
					caseName: null,
					scopeId: null,
					beforeGeometry: null,
					afterGeometry: null
				};

				keys.forEach((key) => {
					switch (key) {
						case `case_key`:
							caseMetadata['caseName'] = `lpis_case:${data[key]}`;
							break;
						case `geometry_before`:
							caseMetadata['beforeGeometry'] = data[key];
							break;
						case `geometry_after`:
							caseMetadata['afterGeometry'] = data[key];
							break;
					}
				});

				if (!caseMetadata.caseName || !caseMetadata.beforeGeometry) {
					throw new Error(`missing case_key of geometry_before`);
				}

				return this._szifCaseCreator
					.prepareMongoLocationMetadata(caseMetadata)
			})
			.then((newMongoLocation) => {
				return new MongoLocations(this._mongo).add(newMongoLocation);
			})
	}

	_updateGeometriesByFiles(keys, data, files) {
		let parsedGeometries = [];
		keys.forEach((key) => {
			if (
				key.toLowerCase().includes(`geometry`)
				&& data[key].hasOwnProperty(`type`)
				&& data[key].hasOwnProperty(`identifier`)
				&& data[key][`type`] === `file`
			) {
				let file = files[data[key][`identifier`]];
				if (file) {
					parsedGeometries.push(
						this._szifCaseCreator.getGeojsonGeometry(file.path)
							.then((geometry) => {
								return this._szifCaseCreator.reprojectGeojsonGeometryFromKrovakToWgs(geometry)
							})
							.then((geometry) => {
								data[key] = geometry;
							})
					)
				} else {
					parsedGeometries.push(
						Promise.reject(
							new Error(`missing file for identifier ${data[key][`identifier`]}`)
						)
					)
				}
			}
		});

		return Promise.all(parsedGeometries);
	}

	populateData(payloadData) {
		if (payloadData.hasOwnProperty('lpis_cases') && payloadData['lpis_cases'].length) {
			let listOfIds = _.compact(_.map(payloadData['lpis_cases'], 'id'));
			if (listOfIds.length) {
				return this.get({any: {id: listOfIds}, unlimited: true})
					.then((currentResults) => {
						let extra = currentResults.extra;

						payloadData['lpis_cases'] = _.map(payloadData['lpis_cases'], record => {
							if (record.id) {
								let currentResult = _.find(currentResults.data, {id: record.id});
								if (currentResult) {
									record.data = currentResult.data;
								}
							}
							return record;
						});

						return this.populateExtraData(extra, payloadData)
					});
			}
		}
	}

	populateExtraData(extra, payloadData) {
		let extraPopulations = [];

		Object.keys(extra).forEach((extraDataType) => {
			if (extra[extraDataType]) {
				if (extraDataType === `places`) {
					let placeIds = _.map(payloadData['lpis_cases'], 'data.place_id');

					extraPopulations.push(
						this._mongo.collection('location').find({_id: {$in: placeIds}}).toArray().then((mongoResults) => {
							payloadData[extraDataType] = _.map(mongoResults, (mongoResult) => {
								let data = () => {
									delete mongoResult['_id'];
									return mongoResult;
								};

								return {
									id: mongoResult._id,
									data: data()
								}
							});
						})
					);
				} else if (extraDataType === `lpis_case_changes`) {
					let lpisCaseIds = _.map(payloadData['lpis_cases'], 'id');
					extraPopulations.push(
						this._pgLpisCaseChanges
							.get({any: {lpis_case_id: lpisCaseIds}, unlimited: true})
							.then((lpisCaseChanges) => {
								payloadData[extraDataType] = lpisCaseChanges.data;
							})
					)
				} else if (extraDataType === `dataviews`) {
					let dataViewsIds = _.map(payloadData['lpis_cases'], 'data.view_id');

					extraPopulations.push(
						this._mongo.collection('dataview').find({_id: {$in: dataViewsIds}}).toArray().then((mongoResults) => {
							payloadData[extraDataType] = _.map(mongoResults, (mongoResult) => {
								let data = () => {
									delete mongoResult['_id'];
									return mongoResult;
								};

								return {
									id: mongoResult._id,
									data: data()
								}
							});
						})
					);
				}
			}
		});

		return Promise.all(extraPopulations);
	}

	get(filter, idOnly) {
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
		pagingQuery.push(`FROM "${this._schema}"."${PgLpisCases.tableName()}" AS a`);
		pagingQuery.push(`LEFT JOIN "${this._schema}"."${PgLpisCaseViewRelations.tableName()}" AS b ON b.lpis_case_id = a.id`);

		let query = [];
		query.push(`SELECT`);

		if (idOnly) {
			query.push(`"a"."id" AS id,`);
			query.push(`(array_agg("b"."view_id") FILTER (WHERE "b"."view_id" IS NOT NULL))[1] AS view_id`);
		} else {
			query.push(`"a"."id" AS id,`);
			query.push(`"a"."submit_date",`);
			query.push(`"a"."code_dpb",`);
			query.push(`"a"."code_ji",`);
			query.push(`"a"."case_key",`);
			query.push(`"a"."change_description",`);
			query.push(`"a"."change_description_place",`);
			query.push(`"a"."change_description_other",`);
			query.push(`"a"."evaluation_result",`);
			query.push(`"a"."evaluation_description",`);
			query.push(`"a"."evaluation_description_other",`);
			query.push(`"a"."evaluation_used_sources",`);
			query.push(`(array_agg("b"."view_id") FILTER (WHERE "b"."view_id" IS NOT NULL))[1] AS view_id,`);
			query.push(`ST_AsGeoJSON("a"."geometry_before") AS geometry_before,`);
			query.push(`ST_AsGeoJSON("a"."geometry_after") AS geometry_after`);
		}

		query.push(`FROM "${this._schema}"."${PgLpisCases.tableName()}" AS a`);
		query.push(`LEFT JOIN "${this._schema}"."${PgLpisCaseViewRelations.tableName()}" AS b ON b.lpis_case_id = a.id`);

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
			.then((results) => {
				payload.data = _.map(results, (result) => {
					let object = {
						id: result.id,
						data: result,
					};

					delete object.data['id'];

					if (object.data['geometry_before']) {
						object.data['geometry_before'] = JSON.parse(object.data['geometry_before']);
					}

					if (object.data['geometry_after']) {
						object.data['geometry_after'] = JSON.parse(object.data['geometry_after']);
					}

					return object;
				});

				payload.extra = {
					// places: true,
					lpis_case_changes: true,
					dataviews: true
				};
			})
			.then(() => {
				return payload;
			})
	}

	update(payloadData, user, extra) {
		let objects = payloadData['lpis_cases'];

		let promises = [];

		objects.forEach((object) => {
			let id = object.id;
			let uuid = object.uuid;
			let data = object.data;

			promises.push(
				this._updateOne(object, payloadData, user, extra)
			);
		});

		return Promise.all(promises)
			.then((results) => {
				payloadData['lpis_cases'] = results;
			});
	}

	_updateOne(object, payloadData, user, extra) {
		let id = object.id;
		let uuid = object.uuid;
		let data = object.data;
		let status = object.status;

		let view_id = data['view_id'];
		delete data['view_id'];

		let keys = Object.keys(data);

		if (!status) return Promise.reject(new Error('status is missing'));

		return this._updateGeometriesByFiles(keys, data, extra.files)
			.then(() => {
				if (id) {
					let sets = [], values = [];
					keys.forEach((key, index) => {
						if (key.toLowerCase().includes(`geometry`)) {
							sets.push(`"${key}" = ST_GeomFromGeoJSON($${index + 1})`);
						} else {
							sets.push(`"${key}" = $${index + 1}`);
						}
						values.push(data[key]);
					});

					let updated = false;
					return Promise
						.resolve()
						.then(() => {
							if (sets.length && sets.length === values.length) {
								return this._pool
									.query(
										`UPDATE "${this._schema}"."${PgLpisCases.tableName()}" SET ${sets.join(', ')} WHERE id = ${id};`,
										values
									)
									.then((results) => {
										if (view_id) {
											return this._pgLpisCaseViewRelations.update([{
												lpis_case_id: id,
												view_id: view_id
											}]);
										}
									})
									.then(() => {
										updated = true;
									})
							}
						})
						.then(() => {
							if (status) {
								return this._pgLpisCaseChanges
									.create(
										{
											lpis_case_changes: [
												{
													data: {
														changed_by: user.id,
														lpis_case_id: id,
														status: status
													}
												}
											]
										},
										user
									)
									.then(() => {
										updated = true;
									})
							}
						})
						.then(() => {
							if(!updated) {
								throw new Error(`nothing to update`);
							}
						})
				} else if (uuid) {
					return this._createOne(object, payloadData, user, extra)
						.then((result) => {
							id = result.id;
							uuid = result.uuid;
						})
				}
			})
			.then(() => {
				return {
					id: id,
					uuid: uuid
				}
			})
			.catch((error) => {
				return {
					uuid: uuid,
					status: `error`,
					message: error.message
				}
			})
	}

	async delete(data) {
		let lpisCases = data['lpis_cases'];
		if (lpisCases) {
			let promises = [];
			for (let lpisCase of lpisCases) {
				await this._deleteOne(lpisCase.id)
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

	_deleteOne(lpisCaseId) {
		let status = {
			deleted: false
		};
		return this._pool.query(
			`DELETE FROM "${this._schema}"."${PgLpisCases.tableName()}" WHERE id = ${lpisCaseId}`
		).then((result) => {
			if (result.rowCount) {
				status.deleted = true;
			}
		}).then(() => {
			return this._pgPermissions.removeAllForResource(PgLpisCases.tableName(), lpisCaseId);
		}).then(() => {
			return status;
		});
	}

	static tableName() {
		return `lpis_case`;
	}
}

module.exports = PgLpisCases;