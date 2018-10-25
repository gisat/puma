const _ = require('lodash');
const conn = require('../common/conn');
const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');
const PgMetadataChanges = require('../metadata/PgMetadataChanges');

/**
 * Generic class that is used throughout the application. It represents a collection of metadata items stored in the
 * PostgreSQL database. It is basically an interface specifying default operation that must be possible on every collection.
 * The collection isn't equal to table. There will be relations represented as tables in the database, which won't
 * be represented by this interface.
 */
class PgCollection {
	constructor(pool, schema, mongo, name) {
		this._pool = pool;
		this._schema = schema;
		this._mongo = mongo;
		this._name = name;

		this._pgPermissions = new PgPermissions(pool, schema);
		this._pgMetadataChanges = new PgMetadataChanges(pool, schema);

		this._limit = 100;
		this._offset = 0;

		this._legacy = false;

		this._groupName = null;
		this._collectionName = null;
		this._tableName = null;
		this._permissionResourceTypes = null;

		this._publicGroupId = 2;
	}

	create(objects, user, extra) {
		let group = objects[this._groupName];

		if (group) {
			let promises = [];
			group.forEach((object) => {
				if (object.key && !object.data) {
					promises.push({key: object.key, uuid: object.uuid});
				} else if (!object.key && object.data) {
					promises.push(this.createOne(object, object, user, extra));
				} else {
					promises.push({key: object.key, uuid: object.uuid, error: `no data`});
				}
			});

			return Promise.all(promises)
				.then((results) => {
					if (results && results.length) {
						objects[this._groupName] = results;
						return results;
					}
				})
		} else {
			throw new Error('Group is not set!');
		}
	}

	createOne(object, objects, user, extra) {
		return Promise.resolve()
			.then(() => {
				if (!this._legacy) {
					return this.postgresCreateOne(object, objects, user, extra);
				} else {
					return this.mongoCreateOne(object, objects, user, extra);
				}
			})
			.then((createdObject) => {
				return this._pgMetadataChanges.createChange('create', this._tableName, createdObject.key, user.id, object.data)
					.then(() => {
						return createdObject;
					})
			});
	}

	mongoCreateOne(object, objects, user, extra) {
		let key = Number(conn.getNextId());
		let model = {
			_id: key,
			...object.data
		};
		return this._mongo
			.collection(this._collectionName)
			.insert(model)
			.then(() => {
				return this.setAllPermissionsToResourceForUser(key, user);
			})
			.then(() => {
				return {
					key: key,
					uuid: object.uuid,
					data: {
						...model,
						_id: undefined
					}
				};
			})
	}

	postgresCreateOne(object, objects, user, extra) {
		let uuid = object.uuid;
		let data = object.data;

		let keys = Object.keys(data);
		let columns = _.map(keys, (key) => {
			return `"${key}"`;
		});
		let values = _.map(keys, (key) => {
			return data[key];
		});

		return this._pool
			.query(
				`INSERT INTO "${this._schema}"."${this._tableName}" (${columns.join(', ')}) VALUES (${_.map(values, (value, index) => {
					return keys[index] === 'geometry' ? `ST_GeomFromGeoJSON($${index + 1})` : `$${index + 1}`
				}).join(', ')}) RETURNING id AS key;`,
				values
			)
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0].key;
				}
			})
			.then((key) => {
				return this.setAllPermissionsToResourceForUser(key, user)
					.then(() => {
						return key;
					})
			})
			.then((key) => {
				return {
					key: key,
					uuid: uuid
				};
			});
	}

	update(objects, user, extra) {
		let group = objects[this._groupName];

		return this.getResourceIdsForUserAndPermissionType(user, Permission.UPDATE)
			.then(([availableKeys, isAdmin]) => {
				let promises = [];

				group.forEach((object) => {
					if (availableKeys.includes(object.key) || isAdmin) {
						promises.push(
							this.updateOne(object, objects, user, extra)
						);
					} else {
						promises.push(
							Promise.resolve({...object, success: false, message: 'unauthorized'})
						);
					}
				});

				return Promise.all(promises)
					.then((results) => {
						objects[this._groupName] = results;
					});
			});
	}

	updateOne(object, objects, user, extra) {
		return Promise.resolve()
			.then(() => {
				if (!this._legacy) {
					return this.postgresUpdateOne(object, objects, user, extra);
				} else {
					return this.mongoUpdateOne(object, objects, user, extra);
				}
			})
			.then((updatedObject) => {
				return this._pgMetadataChanges.createChange('update', this._tableName, updatedObject.key, user.id, object.data)
					.then(() => {
						return updatedObject;
					})
			});
	}

	mongoUpdateOne(object, objects, user, extra) {
		let key = object.key;
		let data = object.data;

		return this._mongo
			.collection(this._collectionName)
			.findOneAndUpdate({_id: Number(key)}, {'$set': data}, {returnOriginal: false})
			.then((document) => {
				return {
					key: document.value._id,
					data: {
						...document.value,
						_id: undefined,
						created: undefined,
						createdBy: undefined,
						changed: undefined,
						changedBy: undefined
					},
					success: true
				}
			});
	}

	postgresUpdateOne(object, objects, user, extra) {
		let key = object.key;
		let data = object.data;

		let sets = [];
		let values = [];
		Object.keys(data).forEach((property, index) => {
			sets.push(`"${property}" = $${index + 1}`);
			values.push(data[property]);
		});

		let sql = [];
		sql.push(`UPDATE "${this._schema}"."${this._tableName}"`);
		sql.push(`SET`);
		sql.push(sets.join(`, `));
		sql.push(`WHERE id = ${Number(key)} RETURNING id AS key`);

		return this._pool
			.query(sql.join(` `), values)
			.then((result) => {
				return {
					key: result.rows[0].key,
					data: null,
					success: true
				}
			});
	}

	get(filter, user, extra) {
		return this.getResourceIdsForUserAndPermissionType(user, Permission.READ)
			.then(([availableKeys, isAdmin]) => {
				let options = this.getFilterOptions(filter, availableKeys, isAdmin);
				if (!this._legacy) {
					return this.postgresGet(options, filter, user, extra)
						.then((payload) => {
							return [payload, availableKeys];
						})
				} else {
					return this.mongoGet(options, filter)
						.then((payload) => {
							return [payload, availableKeys];
						})
				}
			})
			.then(([payload, availableKeys]) => {
				let resourceKeys = _.map(payload.data, 'key');

				return this.getPermissionsForResourceKeys(resourceKeys, user)
					.then((permissions) => {
						payload = {
							...payload,
							data: _.map(payload.data, (data) => {
								if(permissions.publicKeys.includes(data.key)) {
									return {
										...data,
										public: true
									}
								} else {
									return data;
								}
							})
						};

						payload.permissions = permissions.forResources;

						return [payload, availableKeys];
					});
			})
			.then(([payload, availableKeys]) => {
				return this._pgMetadataChanges.getChangesForAvailableResources(availableKeys)
					.then((changes) => {
						payload.change = _.sortBy(_.flatten(_.map(changes, (changesByResourceType) => {
							return changesByResourceType;
						})), ['data.changed']).pop();
						payload.change = payload.change ? payload.change.data.changed : null;
						return payload;
					});
			})
	}

	getPermissionsForResourceKeys(resourceKeys, user) {
		return Promise.all([
			this.getPermissionsForResourceKeysByUserId(resourceKeys, user.id),
			this.getPermissionsForResourceKeysByUserGroupIds(resourceKeys, _.map(user.groups, 'id'))
		]).then(([userPermissions, groupPermissions]) => {

			let byResourceKey = {};
			_.each([...userPermissions, ...groupPermissions], (userPermission) => {
				if(userPermission.permission === 'PUT') {
					byResourceKey[userPermission.resource_id] = byResourceKey[Number(userPermission.resource_id)] || {};
					byResourceKey[userPermission.resource_id]['update'] = true;
				}
				if(userPermission.permission === 'DELETE') {
					byResourceKey[userPermission.resource_id] = byResourceKey[Number(userPermission.resource_id)] || {};
					byResourceKey[userPermission.resource_id]['delete'] = true;
				}
			});

			let forResources = [];
			_.each(byResourceKey, (permissions, key) => {
				forResources.push({
					resourceKey: Number(key),
					data: permissions
				});
			});

			let publicKeys = _.union(
				_.map(
					_.filter(groupPermissions, {
						group_id: this._publicGroupId,
						permission: 'GET'
					}), (groupPermission) => {
						return Number(groupPermission.resource_id)
					})
			);

			return {
				publicKeys,
				forResources
			}
		})
	}

	getPermissionsForResourceKeysByUserGroupIds(resourceKeys, groupIds) {
		let query = [
			`SELECT * FROM "${this._schema}"."group_permissions" AS gp `,
			`WHERE`,
			`gp.resource_type IN ('${_.compact([this._tableName, this._collectionName]).join(`', '`)}')`,
			`AND gp.resource_id IN ('${resourceKeys.join(`', '`)}')`,
			`AND group_id IN (${groupIds.join(`, `)})`
		];

		return this._pool
			.query(query.join(` `))
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	getPermissionsForResourceKeysByUserId(resourceKeys, userId) {
		let query = [
			`SELECT * FROM "${this._schema}"."permissions" AS p `,
			`WHERE`,
			`p.resource_type IN ('${_.compact([this._tableName, this._collectionName]).join(`', '`)}')`,
			`AND p.resource_id IN ('${resourceKeys.join(`', '`)}')`,
			`AND user_id = ${userId}`
		];

		return this._pool
			.query(query.join(` `))
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	getResourceIdsForUserAndPermissionType(user, permissionType) {
		let isAdmin = !!(_.find(user.groups, {name: 'admin'}));
		let resourceTypesCondition = _.map(this._permissionResourceTypes, (resourceType) => {
			return `resource_type = '${resourceType}'`
		}).join(` OR `);

		let resourceIdsPerType = {};
		return Promise.resolve()
			.then(() => {
				if (isAdmin) {
					return Promise.resolve([[], true]);
				} else {
					return this._pool
						.query(
							`SELECT resource_id::integer AS key, resource_type FROM "${this._schema}"."permissions" WHERE user_id = ${user.id} AND (${resourceTypesCondition}) AND permission = '${permissionType}'`
						)
						.then((result) => {
							_.each(result.rows, (row) => {
								if (!resourceIdsPerType.hasOwnProperty(row.resource_type)) {
									resourceIdsPerType[row.resource_type] = [];
								}
								if (!resourceIdsPerType[row.resource_type].includes(row.key)) {
									resourceIdsPerType[row.resource_type].push(row.key);
								}
							});
						})
						.then(() => {
							return this._pool
								.query(
									`SELECT resource_id::integer AS key, resource_type FROM "${this._schema}"."group_permissions" WHERE group_id IN (${_.map(user.groups, 'id').join(', ')}) AND (${resourceTypesCondition}) AND permission = '${permissionType}'`
								)
								.then((result) => {
									_.each(result.rows, (row) => {
										if (!resourceIdsPerType.hasOwnProperty(row.resource_type)) {
											resourceIdsPerType[row.resource_type] = [];
										}
										if (!resourceIdsPerType[row.resource_type].includes(row.key)) {
											resourceIdsPerType[row.resource_type].push(row.key);
										}
									});
								})
								.then(() => {
									return [resourceIdsPerType, false];
								});
						})
				}
			})
	}

	delete(objects, user, extra) {
		let group = objects[this._groupName];

		return this.getResourceIdsForUserAndPermissionType(user, Permission.DELETE)
			.then(([availableKeys, isAdmin]) => {
				let promises = [];

				group.forEach((object) => {
					let key = object.key;

					if (availableKeys.includes(key) || isAdmin) {
						promises.push(
							this.deleteOne(key, user, extra)
								.then((result) => {
									if (result.hasOwnProperty('deleted')) {
										object.success = result.deleted;
									}
									if (result.hasOwnProperty('message')) {
										object.message = result.message;
									}
								})
						);
					} else {
						object.success = false;
						object.message = 'unauthorized';
					}
				});

				return Promise.all(promises);
			});
	}

	deleteOne(key, user, extra) {
		return Promise.resolve()
			.then(() => {
				if (!this._legacy) {
					return this.postgresDeleteOne(key)
				} else {
					return this.mongoDeleteOne(key);
				}
			})
			.then((result) => {
				return this._pgMetadataChanges.createChange('delete', this._tableName, key, user.id)
					.then(() => {
						return result;
					})
			});
	}

	mongoDeleteOne(key) {
		return this._mongo
			.collection(this._collectionName)
			.remove({_id: Number(key)})
			.then((result) => {
				if (result.result && result.result.ok && result.result.n) {
					return this.removeAllPermissionsByResourceKey(key)
						.then(() => {
							return {
								success: true
							}
						});
				}
			})
			.catch((error) => {
				return {
					success: false,
					message: error.message
				}
			})
	}

	postgresDeleteOne(key) {
		return this._pool
			.query(`DELETE FROM "${this._schema}"."${this._tableName}" WHERE id = ${key}`)
			.then((result) => {
				if (result.rowCount) {
					return this.removeAllPermissionsByResourceKey(key)
						.then(() => {
							return {
								success: true
							}
						});
				}
			})
			.catch((error) => {
				return {
					success: false,
					message: error.message
				}
			})
	}

	removeAllPermissionsByResourceKey(resourceKey) {
		return this._pool
			.query(
				`DELETE FROM "${this._schema}"."permissions" WHERE resource_id = '${resourceKey}' AND resource_type = '${this._tableName}'`
			).then(() => {
				return this._pool
					.query(
						`DELETE FROM "${this._schema}"."group_permissions" WHERE resource_id = '${resourceKey}' AND resource_type = '${this._tableName}'`
					)
			});
	}

	getFilterOptionsForIn(filter, availableKeys, isAdmin) {
		let includes;
		if (!isAdmin) {
			if (filter.hasOwnProperty('in')) {
				includes = {
					...filter['in']
				};

				_.each(availableKeys, (keys, type) => {
					if (type === this._tableName || type === this._collectionName) {
						type = `key`;
					}
					if (filter['in'][this.getTypeKeyColumnName(type)]) {
						includes[this.getTypeKeyColumnName(type)] = _.compact(_.map(filter['in'][this.getTypeKeyColumnName(type)], (key) => {
							return keys.includes(key) && key
						}));
					} else {
						includes[this.getTypeKeyColumnName(type)] = keys;
					}
				});

				if (filter['in'] && filter['in']['key'] && availableKeys['key']) {
					includes['key'] = _.compact(_.map(filter['in']['key'], (key) => {
						return availableKeys.includes(key) && key
					}));
				}

				delete filter['in'];
			} else {
				if (Object.keys(availableKeys).length) {
					includes = {};
					_.each(availableKeys, (keys, type) => {
						if (type === this._tableName || type === this._collectionName) {
							type = `key`;
						}
						includes[this.getTypeKeyColumnName(type)] = keys;
					});
				} else {
					includes = {
						key: [-1]
					};
				}
			}
		} else {
			if (filter.hasOwnProperty('in')) {
				includes = filter['in'];
				delete filter['in'];
			}
		}

		if (includes) {
			_.each(Object.keys(includes), (property) => {
				if (includes[property].length) {
					includes[property] = _.compact(includes[property]);
				}
				if (!includes[property].length) {
					includes[property] = [-1];
				}
			});
		}

		return includes;
	}

	getTypeKeyColumnName(type) {
		switch (type) {
			default:
				return type
		}
	}

	getFilterOptions(filter, availableKeys, isAdmin) {
		filter = {
			...filter
		};

		let options = {};

		options.limit = this._limit;
		if (filter.hasOwnProperty('limit')) {
			options.limit = Number(filter['limit'] ? filter['limit'] : options.limit);
			delete filter['limit'];
		}

		options.offset = this._offset;
		if (filter.hasOwnProperty('offset')) {
			options.offset = Number(filter['offset'] ? filter['offset'] : options.offset);
			delete filter['offset'];
		}

		if (filter.hasOwnProperty('like')) {
			options.like = filter['like'];
			delete filter['like'];
		}

		let includes = this.getFilterOptionsForIn(filter, availableKeys, isAdmin);
		if (includes) {
			options.in = includes;
		}

		if (filter.hasOwnProperty('notIn')) {
			options.notIn = filter['notIn'];
			delete filter['notIn'];
		}

		if (filter.hasOwnProperty('unlimited')) {
			options.unlimited = filter.unlimited;
			delete filter['unlimited'];
		}

		if (filter.hasOwnProperty('sort')) {
			options.sort = filter.sort;
			delete filter['sort'];
		}

		options.keys = filter ? Object.keys(filter) : [];

		return options;
	}

	getMongoFilter(options, filter) {
		let mongoFilter = {};

		if (options.keys.length || options.like || options.in || options.notIn) {
			let where = [];
			options.keys.forEach((key) => {
				if (key === 'key') {
					mongoFilter._id = isNaN(filter[key]) ? String(filter[key]) : Number(filter[key]);
				} else if (filter[key] === null) {
					mongoFilter[key] = {
						'$exists': false
					};
				} else {
					mongoFilter[key] = filter[key];
				}
			});

			if (options.like) {
				Object.keys(options.like).forEach((key) => {
					mongoFilter[key === 'key' ? '_id' : key] = {
						'$regex': options.like[key],
						'$options': 'i'
					}
				});
			}

			if (options.in) {
				Object.keys(options.in).forEach((key) => {
					mongoFilter[key === 'key' ? '_id' : key] = {
						'$in': options.in[key]
					}
				});
			}

			if (options.notIn) {
				Object.keys(options.notIn).forEach((key) => {
					mongoFilter[key === 'key' ? '_id' : key] = {
						'$nin': options.notIn[key]
					}
				});
			}
		}

		return mongoFilter;
	}

	mongoGet(options, filter) {
		let payload = {};
		let mongoFilter = this.getMongoFilter(options, filter);

		return this._mongo.collection(this._collectionName).find(mongoFilter).count()
			.then((total) => {
				let mongoQuery = this._mongo
					.collection(this._collectionName)
					.find(mongoFilter);

				if (!options.unlimited) {
					payload.limit = options.limit;
					payload.offset = options.offset;
					payload.total = Number(total);

					mongoQuery = mongoQuery
						.skip(options.offset)
						.limit(options.limit);

				}

				if (options.sort) {
					let orderby = {};
					Object.keys(options.sort).forEach((key) => {
						orderby[key === 'key' ? '_id' : key] = options.sort[key] && options.sort[key].toLowerCase() === "descending" ? -1 : 1;
					});

					mongoQuery = mongoQuery.sort(orderby);
				}

				return mongoQuery.toArray();
			})
			.then((documents) => {
				payload.data = _.map(documents, (document) => {
					return this.parseMongoDocument(document);
				});
				return payload;
			});
	}

	parseMongoDocument(document) {
		return {
			key: document._id,
			data: {
				...document,
				_id: undefined,
				created: undefined,
				createdBy: undefined,
				changed: undefined,
				changedBy: undefined
			}
		}
	}

	getSql(options, filter, user, extra) {
		let sql = [];
		sql.push(`SELECT ${extra.idOnly ? 'id AS key' : 'id AS key, *'} FROM "${this._schema}"."${this._tableName}" AS a`);

		if (options.keys.length || options.like || options.in || options.notIn) {
			let where = [];
			options.keys.forEach((key) => {
				if (key === 'key' || key === 'id') {
					where.push(`"a"."id" = ${Number(filter[key])}`);
				} else {
					if (isNaN(filter[key])) {
						where.push(`"${key}" = '${String(filter[key])}'`);
					} else if (filter[key] === null) {
						where.push(`"${key}" IS NULL`);
					} else if (!isNaN(filter[key])) {
						where.push(`"${key}" = ${Number(filter[key])}`);
					}
				}
			});

			if (options.like) {
				Object.keys(options.like).forEach((key) => {
					where.push(`"${key}" ILIKE '%${options.like[key]}%'`);
				});
			}

			if (options.in) {
				Object.keys(options.in).forEach((key) => {
					where.push(`${key === 'key' ? `"a"."id"` : `"${key}"`} IN (${options.in[key].join(', ')})`);
				});
			}

			if (options.notIn) {
				Object.keys(options.notIn).forEach((key) => {
					where.push(`${key === 'key' ? `"a"."id"` : `"${key}"`} NOT IN (${options.notIn[key].join(', ')})`);
				});
			}

			sql.push(`WHERE ${where.join(' AND ')}`);
		}

		sql.push(`GROUP BY "a"."id"`);

		if (options.sort) {
			sql.push(`ORDER BY`);

			Object.keys(options.sort).forEach((key) => {
				let direction = options.sort[key] && options.sort[key].toLowerCase() === "descending" ? "DESC" : "ASC";
				sql.push(`${key === 'key' ? `"a"."id"` : `"${key}"`} ${direction}`);
			});
		} else {
			sql.push(`ORDER BY "a"."id"`);
		}

		return sql.join(' ');
	}

	postgresGet(options, filter, user, extra) {
		let payload = {};

		let sql = this.getSql(options, filter, user, extra);

		return this._pool.query(`SELECT count(*) AS total FROM (${sql}) AS results;`)
			.then((pagingResult) => {
				if (!options.unlimited) {
					payload.limit = options.limit;
					payload.offset = options.offset;
					payload.total = Number(pagingResult.rows[0].total);

					return this._pool.query(`SELECT * FROM (${sql}) AS results LIMIT ${options.limit} OFFSET ${options.offset};`);
				} else {
					return this._pool.query(`SELECT * FROM (${sql}) AS results;`);
				}
			})
			.then((queryResult) => {
				return queryResult.rows;
			})
			.then((rows) => {
				payload.data = _.map(rows, (row) => {
					return {
						key: row.key,
						uuid: row.uuid,
						data: {
							...row,
							key: undefined,
							id: undefined,
							uuid: undefined
						}
					}
				});
				return payload;
			});
	}

	populateData(payloadData, user) {
		if (this._legacy) {
			return payloadData;
		} else {
			if (payloadData.hasOwnProperty(this._groupName) && payloadData[this._groupName].length) {
				return this.get({in: {key: _.map(payloadData[this._groupName], 'key')}, unlimited: true}, user, {})
					.then((currentModels) => {
						payloadData[this._groupName] = _.map(payloadData[this._groupName], model => {
							if (model.key) {
								let currentModel = _.find(currentModels.data, {key: model.key});
								if (currentModel) {
									model = {
										...currentModel
									};
								}
							}
							return model;
						});
					});
			}
		}
	}

	setAllPermissionsToResourceForUser(resource_id, user) {
		let promises = [];

		promises.push(this._pgPermissions.add(user.id, this._tableName, resource_id, Permission.CREATE));
		promises.push(this._pgPermissions.add(user.id, this._tableName, resource_id, Permission.READ));
		promises.push(this._pgPermissions.add(user.id, this._tableName, resource_id, Permission.UPDATE));
		promises.push(this._pgPermissions.add(user.id, this._tableName, resource_id, Permission.DELETE));

		return Promise.all(promises);
	}
}

module.exports = PgCollection;