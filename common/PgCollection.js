const _ = require('lodash');
const conn = require('../common/conn');
const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');
const PgMetadataChanges = require('../metadata/PgMetadataChanges');
const PgMetadataRelations = require('../metadata/PgMetadataRelations');

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
		this._pgMetadataRelations = new PgMetadataRelations(pool, schema);

		this._limit = 100;
		this._offset = 0;

		this._legacy = false;

		this._checkPermissions = true;

		this._groupName = null;
		this._collectionName = null;
		this._tableName = null;
		this._permissionResourceTypes = null;

		this._publicGroupId = 2;

		this._legacyDataPath = "";

		this._customSqlColumns = ``;
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

	get(request, user, extra) {
		return this.getResourceIdsForUserAndPermissionType(user, Permission.READ)
			.then(([availableKeys, isAdmin]) => {
				if (!this._legacy) {
					return this.postgresGet(request, user, extra, availableKeys, isAdmin)
						.then((payload) => {
							return [payload, availableKeys, isAdmin];
						})
				} else {
					return this.mongoGet(request, availableKeys, isAdmin)
						.then((payload) => {
							return [payload, availableKeys, isAdmin];
						})
				}
			})
			.then(([payload, availableKeys, isAdmin]) => {
				let resourceKeys = _.map(payload.data, 'key');

				return this.getPermissionsForResourceKeys(resourceKeys, user, isAdmin)
					.then((permissions) => {
						payload = {
							...payload,
							data: _.map(payload.data, (data) => {
								return {
									...data,
									permissions: permissions[data.key]
								};
							})
						};

						return [payload, availableKeys, isAdmin];
					});
			})
			.then(([payload, availableKeys, isAdmin]) => {
				if(!availableKeys) {	// todo if user is admin, there are no availableKeys, but next method which return changes need object with some keys atleast, i have to rewrite this to something meaningful
					availableKeys = {
						[this._tableName]: [],
						[this._collectionName]: []
					}
				}
				return this._pgMetadataChanges.getChangesForAvailableResources(availableKeys, isAdmin)
					.then((changes) => {
						payload.change = _.sortBy(_.flatten(_.map(changes, (changesByResourceType) => {
							return changesByResourceType;
						})), ['data.changed']).pop();
						payload.change = payload.change ? payload.change.data.changed : null;
						return payload;
					});
			})
	}

	getPermissionsForResourceKeys(resourceKeys, user, isAdmin) {
		return Promise.all([
			this.getPermissionsForResourceKeysByUserId(resourceKeys, user.id),
			this.getPermissionsForResourceKeysByUserGroupIds(resourceKeys, _.map(user.groups, 'id'))
		]).then(([userPermissions, groupPermissions]) => {

			let byResourceKey = {
			};

			_.each(resourceKeys, (resourceKey) => {
				let permissions = [...userPermissions, ...groupPermissions];

				if(!byResourceKey.hasOwnProperty(resourceKey)) {
					byResourceKey[resourceKey] = {
						guest: {
							get: false,
							update: false,
							delete: false
						},
						activeUser: {
							get: false,
							update: false,
							delete: false
						}
					};
				}

				if (isAdmin || _.find(permissions, {resource_id: `${resourceKey}`, user_id: user.id, permission: Permission.READ})) {
					byResourceKey[resourceKey].activeUser.get = true;
				}
				if (isAdmin || _.find(permissions, {resource_id: `${resourceKey}`, user_id: user.id, permission: Permission.UPDATE})) {
					byResourceKey[resourceKey].activeUser.update = true;
				}
				if (isAdmin || _.find(permissions, {resource_id: `${resourceKey}`, user_id: user.id, permission: Permission.UPDATE})) {
					byResourceKey[resourceKey].activeUser.delete = true;
				}

				if(!this._checkPermissions || _.find(permissions, {resource_id: `${resourceKey}`, permission: Permission.READ, group_id: this._publicGroupId})) {
					byResourceKey[resourceKey].guest.get = true;
				}
				if(_.find(permissions, {resource_id: `${resourceKey}`, permission: Permission.UPDATE, group_id: this._publicGroupId})) {
					byResourceKey[resourceKey].guest.update = true;
				}
				if(_.find(permissions, {resource_id: `${resourceKey}`, permission: Permission.DELETE, group_id: this._publicGroupId})) {
					byResourceKey[resourceKey].guest.delete = true;
				}
			});

			return byResourceKey;
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
					return Promise.resolve([null, true]);
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

	getFilterOptions(request, availableKeys, isAdmin) {
		request = {
			...request
		};

		let options = {};

		options.limit = this._limit;
		if (request.hasOwnProperty('limit')) {
			options.limit = Number(request['limit'] ? request['limit'] : options.limit);
			delete request['limit'];
		}

		options.offset = this._offset;
		if (request.hasOwnProperty('offset')) {
			options.offset = Number(request['offset'] ? request['offset'] : options.offset);
			delete request['offset'];
		}

		if (request.hasOwnProperty('filter')) {
			options.filter = request['filter'];
		}

		let includes = this.getFilterOptionsForIn(request, availableKeys, isAdmin);
		if (includes) {
			options.in = includes;
		}

		if (request.hasOwnProperty('notIn')) {
			options.notIn = request['notIn'];
			delete request['notIn'];
		}

		if (request.hasOwnProperty('unlimited')) {
			options.unlimited = request.unlimited;
			delete request['unlimited'];
		}

		if (request.hasOwnProperty('sort')) {
			options.sort = request.sort;
			delete request['sort'];
		}

		options.keys = request ? Object.keys(request) : [];

		return options;
	}

	getMongoFilter(request, availableKeys, isAdmin) {
		let mongoFilter = {};

		if(!isAdmin) {
			let keys = [];
			if(availableKeys.hasOwnProperty(this._tableName)) {
				keys.push(availableKeys[this._tableName]);
			}
			if(availableKeys.hasOwnProperty(this._collectionName)) {
				keys.push(availableKeys[this._collectionName]);
			}
			keys = _.union(_.compact(_.flatten(keys)));

			if (request.filter && request.filter.hasOwnProperty('key') && this._checkPermissions) {
				if (_.isObject(request.filter.key)) {
					if (request.filter.key.hasOwnProperty('in')) {
						request.filter.key.in = _.compact(_.map(request.filter.key.in, (key) => {
							return keys.includes(key) && key;
						}));
					} else {
						request.filter.key.in = keys;
					}
				} else {
					if (this._checkPermissions && !keys.includes(request.filter.key)) {
						request.filter.key = -1;
					}
				}
			} else if (this._checkPermissions) {
				if (!request.filter) {
					request.filter = {};
				}

				request.filter.key = {
					in: keys
				}
			}
		}

		_.map(request.filter, (data, column) => {
			column = column === 'key' ? '_id': `${this._legacyDataPath}${column}`;
			if(_.isObject(data)) {
				let type = Object.keys(data)[0];
				let value = data[type];

				switch (type) {
					case 'like':
						mongoFilter[column] = {
							'$regex': value,
							'$options': 'i'
						};
						break;
					case 'in':
						mongoFilter[column] = {
							'$in': value
						};
						break;
					case 'notin':
						mongoFilter[column] = {
							'$nin': value
						};
						break;
				}
			} else {
				mongoFilter[column] = data;
			}
		});

		return mongoFilter;
	}

	mongoGet(request, availableKeys, isAdmin) {
		let payload = {};
		let mongoFilter = this.getMongoFilter(request, availableKeys, isAdmin);

		return this._mongo.collection(this._collectionName).find(mongoFilter).count()
			.then((total) => {
				let mongoQuery = this._mongo
					.collection(this._collectionName)
					.find(mongoFilter);

				if (!request.unlimited) {
					payload.limit = _.isNumber(request.limit) && request.limit || this._limit;
					payload.offset = _.isNumber(request.offset) && request.offset || this._offset;
					payload.total = Number(total);

					mongoQuery = mongoQuery
						.skip(payload.offset)
						.limit(payload.limit);

				}

				if (request.order) {
					let orderby = {};

					_.map(request.order, ([key, order]) => {
						orderby[key === 'key' ? '_id' : key] = order && order.toLowerCase() === "descending" ? -1 : 1;
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

	getSql(request, user, extra, availableKeys, isAdmin) {
		let sql = [];
		sql.push(`SELECT ${extra.idOnly ? 'id AS key' : `id AS key, *${this._customSqlColumns}`} FROM "${this._schema}"."${this._tableName}" AS a`);

		if(!isAdmin) {
			let keys = [];
			if(availableKeys.hasOwnProperty(this._tableName)) {
				keys.push(availableKeys[this._tableName]);
			}
			if(availableKeys.hasOwnProperty(this._collectionName)) {
				keys.push(availableKeys[this._collectionName]);
			}
			keys = _.union(_.compact(_.flatten(keys)));

			if(!keys.length) {
				keys.push(-1);
			}

			if(request.filter && request.filter.hasOwnProperty('key') && this._checkPermissions) {
				if (_.isObject(request.filter.key)) {
					if (request.filter.key.hasOwnProperty('in') && this._checkPermissions) {
						request.filter.key.in = _.compact(_.map(request.filter.key.in, (key) => {
							return keys.includes(key) && key;
						}));
					} else if(this._checkPermissions) {
						request.filter.key.in = keys.length;
					}
				} else {
					if (this._checkPermissions && !keys.includes(request.filter.key)) {
						request.filter.key = -1;
					}
				}
			} else if(this._checkPermissions) {
				if(!request.filter) {
					request.filter = {};
				}

				request.filter.key = {
					in: keys
				}
			}
		}

		let where = [];
		_.map(request.filter, (data, column) => {
			column = column === 'key' ? 'id': column;
			if(_.isObject(data)) {
				let type = Object.keys(data)[0];
				let value = data[type];

				switch (type) {
					case 'like':
						where.push(
							`"${column}" ILIKE '%${value}%'`
						);
						break;
					case 'in':
						where.push(
							`"${column}" IN (${value})`
						);
						break;
					case 'notin':
						where.push(
							`"${column}" NOT IN (${value})`
						);
						break;
				}
			} else {
				where.push(
					`"${column}" = ${_.isNumber(data) ? data : `'${data}'`}`
				);
			}
		});

		if(where.length) {
			sql.push(`WHERE ${where.join(' AND ')}`);
		}

		if (request.order) {
			sql.push(`ORDER BY`);

			_.map(request.order, ([key, order]) => {
				let direction = order && order.toLowerCase() === "descending" ? "DESC" : "ASC";
				sql.push(`${key === 'key' ? `"a"."id"` : `"${key}"`} ${direction}`);
			});
		} else {
			sql.push(`ORDER BY "a"."id"`);
		}

		return sql.join(' ');
	}

	postgresGet(request, user, extra, availableKeys, isAdmin) {
		let payload = {};

		let sql = this.getSql(request, user, extra, availableKeys, isAdmin);

		return this._pool.query(`SELECT count(*) AS total FROM (${sql}) AS results;`)
			.then((pagingResult) => {
				if (!request.unlimited) {
					payload.limit = _.isNumber(request.limit) && request.limit || this._limit;
					payload.offset = _.isNumber(request.offset) && request.offset || this._offset;
					payload.total = Number(pagingResult.rows[0].total);

					return this._pool.query(`SELECT * FROM (${sql}) AS results LIMIT ${payload.limit} OFFSET ${payload.offset};`);
				} else {
					return this._pool.query(`SELECT * FROM (${sql}) AS results;`);
				}
			})
			.then((queryResult) => {
				return queryResult.rows;
			})
			.then((rows) => {
				payload.data = _.map(rows, (row) => {
					if(row.geometry && _.isString(row.geometry)) {
						row.geometry = JSON.parse(row.geometry);
					}

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