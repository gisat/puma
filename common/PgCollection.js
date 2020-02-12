const _ = require('lodash');
const uuidv4 = require(`uuid/v4`);
const child_process = require(`child_process`);
const fs = require(`fs`);
const fse = require(`fs-extra`);
const path = require(`path`);

const config = require(`../config`);

const conn = require('../common/conn');

const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');
const PgMetadataChanges = require('../metadata/PgMetadataChanges');
const PgMetadataRelations = require('../metadata/PgMetadataRelations');

const proj4KrovakDefinition = `+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=570.8,85.7,462.8,4.998,1.587,5.261,3.56 +units=m +no_defs`;
const proj4Wgs84Definition = `+proj=longlat +datum=WGS84 +no_defs`;

/**
 * Generic class that is used throughout the application. It represents a collection of metadata items stored in the
 * PostgreSQL database. It is basically an interface specifying default operation that must be possible on every collection.
 * The collection isn't equal to table. There will be relations represented as tables in the database, which won't
 * be represented by this interface.
 */
class PgCollection {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._pgPermissionsSchema = config.pgSchema.data;
		this._pgDataSchema = config.pgSchema.data;

		this._pgPermissions = new PgPermissions(this._pgPool, this._pgPermissionsSchema);
		this._pgMetadataChanges = new PgMetadataChanges(this._pgPool, this._pgDataSchema);

		this._relatedMetadataStores = [];
		this._pgMetadataRelations = null;

		this._limit = 100;
		this._offset = 0;

		this._legacy = false;

		this._checkPermissions = true;

		this._groupName = null;
		this._collectionName = null;
		this._tableName = null;
		this._keyType = null;

		this._basePermissionResourceType = null;
		this._permissionResourceTypes = null;

		this._publicGroupId = 2;

		this._legacyDataPath = "";

		this._customSqlColumns = ``;

		this._dataSources = null;
		this._relevantColumns = null;
		this._relatedColumns = null;

		this._allowMultipleRelations = false;

		this._allowAttachments = false;
	}

	checkForRestrictions(object, objects, user, extra) {

	}

	populatePayloadWithAdditionalData(object, user) {
	}

	populateObjectWithAdditionalData(payload) {

	}

	async hasUserPermission(user, permission) {
		let groupIds = _.map(user.groups, (group) => {
			return group.id;
		}).join(', ');

		return Promise
			.resolve()
			.then(() => {
				return this._pgPool
					.query(
						`SELECT DISTINCT * FROM ((SELECT "resource_type", "permission" FROM "${config.pgSchema.data}"."permissions" WHERE "user_id" = ${user.id} AND "resource_id" IS NULL) UNION (SELECT "resource_type", "permission" FROM "${config.pgSchema.data}"."group_permissions" WHERE "group_id" IN (${groupIds}) AND "resource_id" IS NULL)) AS sub;`
					);
			})
			.then((pgResult) => {
				let hasPermission = true;

				for(let resourceType of this._permissionResourceTypes) {
					let createPermissionForResourceType = _.find(pgResult.rows, (row) => {
						return row.resource_type === resourceType && row.permission === permission;
					});

					if(!createPermissionForResourceType) {
						hasPermission = false;
					}
				}

				return hasPermission;
			});
	}

	async create(objects, user, extra, overridePermissions) {
		let groupObjects = objects[this._groupName];

		let canCreate = true;

		// todo temporary fix of problem with old permissions logic

		if (this._checkPermissions && !overridePermissions) {
			if (!this._permissionResourceTypes || !await this.hasUserPermission(user, Permission.CREATE)) {
				canCreate = false;
			}
		}

		if (groupObjects) {

			if (
				groupObjects
				&& canCreate
				&& this._allowAttachments
				&& extra.files
			) {
				this.processAttachments(groupObjects, extra.files);
			}

			let promises = [];
			groupObjects.forEach((object) => {
				if (canCreate) {
					if (object.key && !object.data) {
						promises.push({key: object.key});
					} else if (object.data) {
						promises.push(this.createOne(object, objects, user, extra));
					} else {
						promises.push({key: object.key, error: `no data`});
					}
				} else {
					promises.push({key: object.key, data: object.data, error: `has no permission to create this type`});
				}
			});

			return Promise.all(promises)
				.then(async (results) => {
					let failedResults = _.filter(results, (result) => {
						return result.error;
					});

					let correctResults = _.filter(results, (result) => {
						return !result.error;
					});
					if (correctResults && correctResults.length) {
						objects[this._groupName] = await this.get(
							{
								filter: {
									key: {
										in: _.map(correctResults, 'key')
									}
								},
								unlimited: true
							},
							user,
							extra
						).then((getResult) => {
							return getResult.data;
						});
					} else {
						objects[this._groupName] = [];
					}

					if (failedResults && failedResults.length) {
						objects[this._groupName] = _.concat(objects[this._groupName], failedResults);
					}
				})
				.then(() => {
					if (extra.files && extra.files.length) {
						this.clearAttachedFiles(extra.files);
					}
				})
		} else {
			throw new Error('Group is not set!');
		}
	}

	clearAttachedFiles(files) {
		_.each(files, (file) => {
			fse.removeSync(file.path);
		});
	}

	unzipPackage(pathToZipPackage, tempDirectory) {
		// unzip breclav-after.zip -d ./breclav-after
		child_process.execSync(`unzip ${pathToZipPackage} -d ${tempDirectory}`);
		return _.map(fs.readdirSync(tempDirectory), (fileName) => {
			return `${tempDirectory}/${fileName}`;
		});
	}

	isShpSomeKrovak(pathToShpFile) {
		// gdalsrsinfo breclav-after.shp | grep -i "krovak"
		return !!(child_process.execSync(`gdalsrsinfo "${pathToShpFile}" | grep -i "krovak"`));
	}

	getGeojsonFromShp(pathToShpFile, isKrovak, hasPrj) {
		if(isKrovak || !hasPrj) {
			return JSON.parse(child_process.execSync(`ogr2ogr -f GeoJSON -s_srs '${proj4KrovakDefinition}' -t_srs '${proj4Wgs84Definition}' /dev/stdout "${pathToShpFile}"`));
		} else {
			return JSON.parse(child_process.execSync(`ogr2ogr -f GeoJSON -t_srs '${proj4Wgs84Definition}' /dev/stdout "${pathToShpFile}"`));
		}
	}

	parseGeometriesFromAttachments(object, objects, user, extra) {
		_.each(object.data, (value, property) => {
			if (value.startsWith(`attachment:`)) {
				let stringParts = value.split(`:`);
				let attachmentUuid = stringParts[1];
				let tempDirectory = `/tmp/${uuidv4()}`;

				let pathToShpFile, isKrovak, geojson, hasPrj;

				_.each(extra.files, (fileMetadata, fileUuid) => {
					if (fileUuid === attachmentUuid && fileMetadata.originalFilename.toLocaleLowerCase().endsWith(`.zip`)) {
						let unzippedFiles = this.unzipPackage(fileMetadata.path, tempDirectory);

						_.each(unzippedFiles, (unzippedFile) => {
							if (unzippedFile.toLowerCase().endsWith(`.shp`)) {
								pathToShpFile = unzippedFile;
							}
							if(unzippedFile.toLowerCase().endsWith(`.prj`)) {
								hasPrj = true;
							}
						});
					}
				});

				if(pathToShpFile && hasPrj) {
					isKrovak = this.isShpSomeKrovak(pathToShpFile);
				}

				if (pathToShpFile) {
					geojson = this.getGeojsonFromShp(pathToShpFile, isKrovak, hasPrj);
				}

				if (geojson) {
					object.data[property] = geojson.features[0].geometry;
				}

				fse.removeSync(tempDirectory);
			}
		});
	}

	processAttachments(groupObjects, files) {
		let storageDirectory = config.pathToDatastorage;
		fse.mkdirpSync(storageDirectory);

		let filesToKeep = [];
		let attachementsMetadataToStore = [];

		_.each(groupObjects, (groupObject) => {
			if (
				groupObject.hasOwnProperty(`attachments`)
				&& _.isArray(groupObject.attachments)
				&& groupObject.attachments.length
			) {
				if (!groupObject.key) {
					groupObject.key = uuidv4();
				}

				_.each(groupObject.attachments, (groupObjectAttachmentUuid) => {
					let attachedFile = files[groupObjectAttachmentUuid];

					if (attachedFile && !filesToKeep.includes(attachedFile)) {
						filesToKeep.push(attachedFile);
					}

					attachementsMetadataToStore.push(
						{
							key: groupObjectAttachmentUuid,
							originalName: attachedFile.originalFilename,
							localPath: `${storageDirectory}/${path.basename(attachedFile.path)}`,
							relatedResourceKey: groupObject.key,
							created: new Date().toISOString()
						}
					)
				})
			}
		});

		_.each(filesToKeep, (fileToKeey) => {
			fse.copySync(fileToKeey.path, `${storageDirectory}/${path.basename(fileToKeey.path)}`);
		});

		_.each(attachementsMetadataToStore, async (attachementMetadataToStore) => {
			let sql = [], columns = [], values = [];

			_.each(attachementMetadataToStore, (value, column) => {
				columns.push(`"${column}"`);
				values.push(`'${value}'`);
			});

			sql.push(`INSERT INTO ${config.pgSchema.various}."attachments"`);
			sql.push(`(${columns.join(', ')})`);
			sql.push(`VALUES`);
			sql.push(`(${values.join(', ')})`);

			await this
				._pgPool
				.query(sql.join(` `))
				.catch((error) => {
				})
		});
	}

	createOne(object, objects, user, extra) {
		let relations;
		return Promise.resolve()
			.then(() => {
				return this.checkForRestrictions(object, objects, user, extra);
			})
			.then(() => {
				relations = this.parseRelations(object, objects, user, extra);
			})
			.then(() => {
				if (this._allowAttachments && extra.files) {
					this.parseGeometriesFromAttachments(object, objects, user, extra);
				}
			})
			.then(() => {
				return this.postgresCreateOne(object, objects, user, extra);
			})
			.then((createdObject) => {
				return this.createRelated(object, createdObject, objects, user, extra)
					.then(() => {
						return createdObject;
					})
			})
			.then((createdObject) => {
				return this.updateRelations(createdObject.key, relations, object, objects, user, extra)
					.then(() => {
						return createdObject;
					});
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
		let data = object.data;

		let keys = Object.keys(data);

		return Promise.resolve()
			.then(() => {
				if (this._dataSources && keys.includes(`type`) && this._relatedColumns) {
					let dataSource = this._dataSources[data['type']];
					let dataSourceRelevantColumns = dataSource.getRelevantColumns();

					keys = _.difference(keys, dataSourceRelevantColumns);

					let dataSourceRelevantColumnValues = _.map(dataSourceRelevantColumns, (dataSourceRelevantColumn) => {
						return data[dataSourceRelevantColumn];
					});

					return this._pgPool
						.query(
							`INSERT INTO "${this._pgSchema}"."${dataSource.getTableName()}" AS "${dataSource.getTableName()}" ("${dataSourceRelevantColumns.join('", "')}") VALUES (${_.map(dataSourceRelevantColumnValues, (value, index) => {
								return `$${index + 1}`
							})})  RETURNING "${dataSource.getTableName()}"."key"`,
							dataSourceRelevantColumnValues
						)
						.then((queryResult) => {
							return queryResult.rows[0] && queryResult.rows[0].key;
						})
						.then((createdDataSourceKey) => {
							keys.push(this._relatedColumns.baseColumn);
							data[this._relatedColumns.baseColumn] = createdDataSourceKey;
						})
				}
			})
			.then(() => {
				let columns = keys;
				let values = _.map(keys, (key) => {
					return data[key];
				});

				if (object.key) {
					columns.push(`key`);
					values.push(object.key);
				}

				return this.modifyColumnsAndValuesBeforeInsert(columns, values)
			})
			.then(([columns, values]) => {
				let sql;
				if (columns.length && values.length) {
					sql = `INSERT INTO "${this._pgSchema}"."${this._tableName}" ("${columns.join('", "')}") VALUES (${_.map(values, (value, index) => {
						return keys[index].startsWith('geometry') ? `ST_GeomFromGeoJSON($${index + 1})` : `$${index + 1}`
					}).join(', ')}) RETURNING ${this.getReturningSql()};`
				} else {
					sql = `INSERT INTO "${this._pgSchema}"."${this._tableName}" DEFAULT VALUES RETURNING ${this.getReturningSql()};`
				}
				return this._pgPool.query(sql, values);
			})
			.then((queryResult) => {
				if (queryResult.rowCount) {
					return queryResult.rows[0];
				}
			})
			.then((created) => {
				return this.setAllPermissionsToResourceForUser(created.key, user)
					.then(() => {
						return created;
					})
			})
			.then((created) => {
				return this.setAdditionalPermissionToResource(created.key, user)
					.then(() => {
						return created;
					})
			})
			.then((created) => {
				return {
					...created,
					data: null,
					success: true
				};
			});
	}

	modifyColumnsAndValuesBeforeInsert(values, columns) {
		return [values, columns];
	}

	getReturningSql() {
		return `key`;
	}

	parseRelations(object, objects, user, extra) {
		let relations;

		if (this._pgMetadataRelations) {
			let data = object.data;
			let keys = Object.keys(data);

			let possibleRelationProperties = this._pgMetadataRelations.getMetadataTypeKeyColumnNames();
			_.each(keys, (key) => {
				if (possibleRelationProperties.includes(key)) {
					relations = {
						...relations,
						[key]: data[key]
					};
					delete data[key];
				}
			});
		}

		return relations;
	}

	updateRelations(baseKey, relations, object, objects, user, extra) {
		if (relations) {
			return this._pgMetadataRelations.updateRelations(baseKey, relations);
		} else {
			return Promise.resolve();
		}
	}

	createRelated(object, createdObject, objects, user, extra) {
		return Promise.resolve();
	}

	update(objects, user, extra) {
		let isAdmin = !!(_.find(user.groups, {name: 'admin'}));
		let group = objects[this._groupName];

		return this.getResourceIdsForUserAndPermissionType(user, Permission.UPDATE, isAdmin)
			.then(([availableKeys, isAdmin]) => {
				return this.get({filter: {key: {in: _.map(group, `key`)}}, unlimited: true}, user, extra)
					.then((existingData) => {
						return [availableKeys, isAdmin, _.map(existingData.data, `key`)];
					});
			})
			.then(([availableKeys, isAdmin, existingData]) => {
				let promises = [];

				group.forEach((object) => {
					if (!existingData.includes(object.key)) {
						// todo check permission first?
						promises.push(
							this.createOne(object, objects, user, extra)
						);
					} else if (isAdmin || (availableKeys[this._basePermissionResourceType] && availableKeys[this._basePermissionResourceType].includes(object.key))) {
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
					.then(async (results) => {
						let faultyResults = _.filter(results, (result) => {
							return !result.success && result.message
						});
						let correctResults = _.filter(results, (result) => {
							return result.success && !result.message
						});

						let populatedCorrectResults = correctResults.length ? await this.get(
							{
								filter: {
									key: {
										in: _.map(correctResults, 'key')
									}
								},
								unlimited: true
							},
							user,
							extra
						).then((getResult) => {
							let payload = {
								[this._groupName]: getResult.data
							};

							return this.populateData(
								payload,
								user
							).then(() => {
								return payload[this._groupName];
							})
						}) : [];

						objects[this._groupName] = _.concat(populatedCorrectResults, faultyResults);
					});
			});
	}

	updateOne(object, objects, user, extra) {
		let relations;
		return Promise.resolve()
			.then(() => {
				relations = this.parseRelations(object, objects, user, extra);
			})
			.then(() => {
				return this.postgresUpdateOne(object, objects, user, extra);
			})
			.then((updatedObject) => {
				return this.updateRelations(updatedObject.key, relations, object, objects, user, extra)
					.then(() => {
						return updatedObject;
					});
			})
			.then((updatedObject) => {
				return this._pgMetadataChanges.createChange('update', this._tableName, updatedObject.key, user.id, object.data)
					.then(() => {
						return updatedObject;
					})
			})
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

		return Promise.resolve()
			.then(() => {
				if (this._dataSources) {
					return this._pgPool
						.query(`SELECT "${this._tableName}"."type", "${this._tableName}"."${this._relatedColumns.baseColumn}" FROM "${this._pgSchema}"."${this._tableName}" AS "${this._tableName}" WHERE "${this._tableName}"."key" = '${key}'`)
						.then((queryResult) => {
							return queryResult.rows && queryResult.rows[0];
						})
				}
			})
			.then((dataSourceRecord) => {
				if (dataSourceRecord) {
					if (!data.type === dataSourceRecord.type) {
						return {
							key: object.key
						}
					}

					let dataSource = this._dataSources[dataSourceRecord.type];
					let dataSourceKey = dataSourceRecord[this._relatedColumns.baseColumn];
					let relevantColumns = dataSource.getRelevantColumns();

					let dataSourceData = {};

					_.each(relevantColumns, (relevantColumn) => {
						if (data.hasOwnProperty(relevantColumn)) {
							dataSourceData[relevantColumn] = data[relevantColumn];
							delete data[relevantColumn];
						}
					});

					let values = [];
					let sets = [];

					Object.keys(dataSourceData).forEach((property, index) => {
						if (property.startsWith(`geometry`) || property === `bbox`) {
							sets.push(`"${property}" = ST_GeomFromGeoJSON($${index + 1})`);
						} else {
							sets.push(`"${property}" = $${index + 1}`);
						}
						values.push(dataSourceData[property]);
					});

					if (sets.length) {
						return this._pgPool
							.query(
								`UPDATE "${this._pgSchema}"."${dataSource.getTableName()}" SET ${sets.join(', ')} WHERE "key" = '${dataSourceKey}'`,
								values
							);
					}
				}
			})
			.then(() => {
				let sets = [];
				let values = [];

				Object.keys(data).forEach((property, index) => {
					if (property === `geometry` || property === `bbox`) {
						sets.push(`"${property}" = ST_GeomFromGeoJSON($${index + 1})`);
					} else {
						sets.push(`"${property}" = $${index + 1}`);
					}
					values.push(data[property]);
				});

				if (!sets.length) {
					return {
						key: object.key,
						data: null,
						success: true
					}
				}

				let sql = [];
				sql.push(`UPDATE "${this._pgSchema}"."${this._tableName}"`);
				sql.push(`SET`);
				sql.push(sets.join(`, `));
				sql.push(`WHERE "key" = '${key}' RETURNING "key"`);

				return this._pgPool
					.query(sql.join(` `), values)
					.then((pgResult) => {
						return {
							key: pgResult.rows[0].key,
							data: null,
							success: true
						}
					});
			});
	}

	getRecordCountByFilter(filter) {
		let sql = `SELECT COUNT(*) FROM ${config.pgSchema.data}."metadata_changes" WHERE "action" = '${filter.status}' AND "resource_type" = '${this._tableName}' AND "changed" >= '${filter.from}'`;
		return this._pgPool
			.query(sql)
			.then((pgResult) => {
				return {
					data: [{
						filter: filter,
						count: pgResult.rows[0].count
					}]
				}
			})
	}

	get(request, user, extra, doCountOnly) {
		let isAdmin = !!(_.find(user.groups, {name: 'admin'}));

		if (doCountOnly) {
			return this.getRecordCountByFilter(request.filter);
		} else {
			return Promise.resolve()
				.then(async () => {
					if (this._pgMetadataRelations) {
						let possibleRelationColumns = this._pgMetadataRelations.getMetadataTypeKeyColumnNames();
						let requestedRelations = {};
						_.each(possibleRelationColumns, (possibleRelationColumn) => {
							if (request.filter && request.filter.hasOwnProperty(possibleRelationColumn)) {
								requestedRelations[possibleRelationColumn] = request.filter[possibleRelationColumn];
								delete request.filter[possibleRelationColumn];
							}
						});

						if (Object.keys(requestedRelations).length) {
							await this._pgMetadataRelations.getBaseKeysByRelations(requestedRelations)
								.then((baseKeys) => {
									if (!baseKeys.length) {
										// todo this add random uuid when there are no baseKeys, there must be better way how to handle this, fow now it's neccessary to do that to return correct results
										baseKeys.push(uuidv4());
									}
									if (request.filter.hasOwnProperty(`key`)) {
										if (!_.isObject(request.filter.key) && !baseKeys.includes(String(request.filter.key))) {
											request.filter.key = -1;
										} else if (_.isObject(request.filter.key)) {
											if (request.filter.key.hasOwnProperty(`in`)) {
												request.filter.key.in = _.intersectionWith(request.filter.key.in, baseKeys, (first, second) => {
													return String(first) === String(second);
												})
											} else {
												request.filter.key.in = baseKeys;
											}
										}
									} else {
										request.filter.key = {
											in: baseKeys
										}
									}
								});
						}
					}
				})
				.then(() => {
					return this.postgresGet(request, user, extra, isAdmin)
						.then((payload) => {
							return payload;
						})
				})
				.then((payload) => {
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
							return payload;
						});
				})
				.then((payload) => {
					return this.getLatestChangeForUser(user)
						.then((change) => {
							payload.change = change;
							return payload;
						});
				})
				.then(async (payload) => {
					for (let object of payload.data) {
						await this.populateObjectWithAdditionalData(object, user);
					}
					return payload;
				})
				.then(async (payload) => {
					await this.populatePayloadWithAdditionalData(payload);
					return payload;
				})
		}
	}

	getLatestChangeForUser(user) {
		let userId = user.id;
		let groupIds = _.map(user.groups, `id`);

		let query = [
			`SELECT "changed" FROM "${config.pgSchema.data}"."metadata_changes"`,
			`WHERE "resource_key" IN (`,
			`SELECT DISTINCT "resource_id" FROM ${config.pgSchema.data}."permissions"`,
			`WHERE "resource_type" = '${this._tableName}'`,
			`AND user_id = ${userId}`,
			`AND permission = '${Permission.READ}'`,
			`UNION`,
			`SELECT DISTINCT "resource_id"`,
			`FROM "${config.pgSchema.data}"."group_permissions"`,
			`WHERE "resource_type" = '${this._tableName}'`,
			`AND "group_id" in (${groupIds.join(`, `)})`,
			`AND "permission" = '${Permission.READ}')`,
			`ORDER BY "changed" DESC LIMIT 1`
		];

		return this._pgPool.query(query.join(` `))
			.then((queryResult) => {
				return queryResult.rows[0] && queryResult.rows[0].changed;
			})
	}

	getPermissionsForResourceKeys(resourceKeys, user, isAdmin) {
		return Promise.all([
			this.getPermissionsForResourceKeysByUserId(resourceKeys, user.id),
			this.getPermissionsForResourceKeysByUserGroupIds(resourceKeys, _.map(user.groups, 'id'))
		]).then(([userPermissions, groupPermissions]) => {

			let byResourceKey = {};

			let permissions = [...userPermissions, ...groupPermissions];

			_.each(resourceKeys, (resourceKey) => {
				if (!byResourceKey.hasOwnProperty(resourceKey)) {
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

				if (
					isAdmin
					|| _.find(permissions, (permission) => {
						return permission.resource_id === `${resourceKey}`
							&& permission.group_id !== this._publicGroupId	// todo check if this is useful
							&& permission.permission === Permission.READ
					})
				) {
					byResourceKey[resourceKey].activeUser.get = true;
				}
				if (isAdmin || _.find(permissions, (permission) => {
					return permission.resource_id === `${resourceKey}`
						&& permission.group_id !== this._publicGroupId	// todo check if this is useful
						&& permission.permission === Permission.UPDATE
				})
				) {
					byResourceKey[resourceKey].activeUser.update = true;
				}
				if (isAdmin || _.find(permissions, (permission) => {
					return permission.resource_id === `${resourceKey}`
						&& permission.group_id !== this._publicGroupId	// todo check if this is useful
						&& permission.permission === Permission.DELETE
				})
				) {
					byResourceKey[resourceKey].activeUser.delete = true;
				}

				if (!this._checkPermissions || _.find(permissions, {
					resource_id: `${resourceKey}`,
					permission: Permission.READ,
					group_id: this._publicGroupId
				})) {
					byResourceKey[resourceKey].guest.get = true;
				}
				if (_.find(permissions, {
					resource_id: `${resourceKey}`,
					permission: Permission.UPDATE,
					group_id: this._publicGroupId
				})) {
					byResourceKey[resourceKey].guest.update = true;
				}
				if (_.find(permissions, {
					resource_id: `${resourceKey}`,
					permission: Permission.DELETE,
					group_id: this._publicGroupId
				})) {
					byResourceKey[resourceKey].guest.delete = true;
				}
			});

			return byResourceKey;
		})
	}

	getPermissionsForResourceKeysByUserGroupIds(resourceKeys, groupIds) {
		// TODO this._tableName and this._collectionName are propably unnecessary
		if (!resourceKeys || !resourceKeys.length) {
			return Promise.resolve([]);
		}

		let query = [
			`SELECT * FROM "${this._pgPermissionsSchema}"."group_permissions" AS gp `,
			`WHERE`,
			`gp.resource_type IN ('${this._permissionResourceTypes.join(`', '`)}')`,
			`AND gp.resource_id IN ('${resourceKeys.join(`', '`)}')`,
			`AND group_id IN (${groupIds.join(`, `)})`
		];

		return this._pgPool
			.query(query.join(` `))
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	getPermissionsForResourceKeysByUserId(resourceKeys, userId) {
		// TODO this._tableName and this._collectionName are propably unnecessary
		if (!resourceKeys || !resourceKeys.length) {
			return Promise.resolve([]);
		}

		let query = [
			`SELECT * FROM "${this._pgPermissionsSchema}"."permissions" AS p `,
			`WHERE`,
			`p.resource_type IN ('${this._permissionResourceTypes.join(`', '`)}')`,
			`AND p.resource_id IN ('${resourceKeys.join(`', '`)}')`,
			`AND user_id = ${userId}`
		];

		return this._pgPool
			.query(query.join(` `))
			.then((queryResult) => {
				return queryResult.rows;
			});
	}

	getResourceIdsForUserAndPermissionType(user, permissionType, isAdmin) {
		let resourceTypesCondition = _.map(this._permissionResourceTypes, (resourceType) => {
			return `resource_type = '${resourceType}'`
		}).join(` OR `);

		let resourceIdsPerType = {};
		return Promise.resolve()
			.then(() => {
				if (isAdmin || !this._checkPermissions) {
					return Promise.resolve([null, true]);
				} else {
					return this._pgPool
						.query(
							`SELECT resource_id AS key, resource_type FROM "${this._pgPermissionsSchema}"."permissions" WHERE user_id = ${user.id} AND (${resourceTypesCondition}) AND permission = '${permissionType}'`
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
							return this._pgPool
								.query(
									`SELECT resource_id AS key, resource_type FROM "${this._pgPermissionsSchema}"."group_permissions" WHERE group_id IN (${_.map(user.groups, 'id').join(', ')}) AND (${resourceTypesCondition}) AND permission = '${permissionType}'`
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

					if (isAdmin || (availableKeys[this._tableName] && availableKeys[this._tableName].includes(key))) {
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
						if (this._pgMetadataRelations) {
							return this._pgMetadataRelations.deleteRelations(key);
						}
					})
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
		return this._pgPool
			.query(`DELETE FROM "${this._pgSchema}"."${this._tableName}" WHERE "key" = '${key}' RETURNING *`)
			.then((queryResult) => {
				if (queryResult.rows && queryResult.rows[0]) {
					if (this._dataSources) {
						let dataSource = this._dataSources[queryResult.rows[0].type];
						let dataSourceKey = queryResult.rows[0][this._relatedColumns.baseColumn];
						if (dataSourceKey && dataSource) {
							return this._pgPool
								.query(
									`DELETE FROM "${this._pgSchema}"."${dataSource.getTableName()}" WHERE "key" = '${dataSourceKey}' RETURNING *`
								)
								.then((queryResult) => {
									return true;
								})
						}
					} else {
						return true;
					}
				}
			})
			.then((deleted) => {
				if (deleted) {
					return this.removeAllPermissionsByResourceKey(key)
						.then(() => {
							return {
								deleted
							}
						});
				}
			})
			.catch((error) => {
				return {
					deleted: false,
					message: error.message
				}
			})
	}

	removeAllPermissionsByResourceKey(resourceKey) {
		return this._pgPool
			.query(
				`DELETE FROM "${this._pgPermissionsSchema}"."permissions" WHERE resource_id = '${resourceKey}' AND resource_type = '${this._tableName}'`
			).then(() => {
				return this._pgPool
					.query(
						`DELETE FROM "${this._pgPermissionsSchema}"."group_permissions" WHERE resource_id = '${resourceKey}' AND resource_type = '${this._tableName}'`
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

		if (!isAdmin) {
			let keys = [];
			if (availableKeys.hasOwnProperty(this._tableName)) {
				keys.push(availableKeys[this._tableName]);
			}
			if (availableKeys.hasOwnProperty(this._collectionName)) {
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
			column = column === 'key' ? '_id' : `${this._legacyDataPath}${column}`;
			if (_.isObject(data)) {
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
		let data = {
			...document
		};

		delete data._id;
		delete data.created;
		delete data.createdBy;
		delete data.changedBy;
		delete data.changed;

		return {
			key: document._id,
			data
		}
	}

	parsePostgresRow(row) {
		let data = {
			...row
		};

		delete data.key;
		delete data.id;
		delete data.uuid;
		delete data.total;
		delete data.created;

		return {
			key: row.key,
			data
		}
	}

	getSql(request, user, extra, isAdmin, limit, offset) {
		let sql = [];

		if (extra.idOnly) {
			sql.push(
				`SELECT "${this._tableName}"."key", MAX("mc"."changed") AS created, COUNT(*) OVER() AS total`
			);
		} else {
			let columns = [
				`"${this._tableName}".*`
			];

			if (this._relevantColumns) {
				columns = [];
				_.each(this._relevantColumns, (relevantColumn) => {
					columns.push(
						`"${this._tableName}"."${relevantColumn}" AS "${relevantColumn}"`
					);
				});
			}

			if (this._dataSources) {
				_.each(this._dataSources, (dataSource) => {
					_.each(dataSource.getRelevantColumns(), (relevantColumn) => {
						columns.push(
							`"${dataSource.getTableName()}"."${relevantColumn}" AS "#${dataSource.getType()}#${relevantColumn}"`
						);
					});
				});
			}

			let columnsString = columns.join(`, `);

			sql.push(
				`SELECT ${columnsString}${this._customSqlColumns}, MAX("mc"."changed") AS created, COUNT(*) OVER() AS total`
			)
		}

		sql.push(
			`FROM "${this._pgSchema}"."${this._tableName}" AS "${this._tableName}"`
		);

		sql.push(
			`LEFT JOIN "${config.pgSchema.data}"."metadata_changes" AS mc ON "mc"."resource_key" = "${this._tableName}"."key"::TEXT`
		);

		if (this._dataSources && this._relatedColumns) {
			_.each(this._dataSources, (dataSource) => {
				if (dataSource.getTableName()) {
					sql.push(
						`LEFT JOIN "${this._pgSchema}"."${dataSource.getTableName()}" AS "${dataSource.getTableName()}" ON "${dataSource.getTableName()}"."${this._relatedColumns.relatedColumn}" = "${this._tableName}"."${this._relatedColumns.baseColumn}"`
					)
				}
			});
		}

		// todo whole where generation logic should be revised in near future
		let where = [];
		_.map(request.filter, (data, column) => {
			let tableNamePrefixs = [];

			if (this._dataSources) {
				_.each(this._dataSources, (dataSource) => {
					if (dataSource.getRelevantColumns().includes(column)) {
						tableNamePrefixs.push(dataSource.getTableName());
					}
				});
			}

			if (!tableNamePrefixs.length) {
				tableNamePrefixs.push(this._tableName);
			}

			if (_.isObject(data)) {
				let type = Object.keys(data)[0];
				let value = data[type];

				let isString = false;

				switch (type) {
					case 'timefrom':
						where.push(
							_.map(tableNamePrefixs, (tableNamePrefix) => {
								return `"${tableNamePrefix}"."${column}" >= '${value}'::TIMESTAMP`
							}).join(' OR ')
						);
						break;
					case 'timeto':
						where.push(
							_.map(tableNamePrefixs, (tableNamePrefix) => {
								return `"${tableNamePrefix}"."${column}" <= '${value}'::TIMESTAMP`
							}).join(' OR ')
						);
						break;
					case 'like':
						where.push(
							_.map(tableNamePrefixs, (tableNamePrefix) => {
								return `"${tableNamePrefix}"."${column}" ILIKE '%${value}%'`
							}).join(' OR ')
						);
						break;
					case 'in':
						_.each(value, (value) => {
							if (_.isString(value)) {
								isString = true;
							}
						});

						if (isString) {
							where.push(
								_.map(tableNamePrefixs, (tableNamePrefix) => {
									return `"${tableNamePrefix}"."${column}" IN ('${value.join(`', '`)}')`
								}).join(' OR ')
							)
						} else {
							where.push(
								_.map(tableNamePrefixs, (tableNamePrefix) => {
									return `"${tableNamePrefix}"."${column}" IN (${value.join(', ')})`
								}).join(' OR ')
							)
						}
						break;
					case 'notin':
						_.each(value, (value) => {
							if (_.isString(value)) {
								isString = true;
							}
						});

						if (isString) {
							where.push(
								_.map(tableNamePrefixs, (tableNamePrefix) => {
									return `"${tableNamePrefix}"."${column}" NOT IN ('${value.join(`', '`)}')`
								}).join(' AND ')
							);
						} else {
							where.push(
								_.map(tableNamePrefixs, (tableNamePrefix) => {
									return `"${tableNamePrefix}"."${column}" NOT IN (${value.join(', ')})`
								}).join(' AND ')
							);
						}
						break;
				}
			} else {
				if (data === null) {
					where.push(
						_.map(tableNamePrefixs, (tableNamePrefix) => {
							return `"${tableNamePrefix}"."${column}" IS NULL`
						}).join(' OR ')
					);
				} else {
					where.push(
						_.map(tableNamePrefixs, (tableNamePrefix) => {
							return `"${tableNamePrefix}"."${column}" = ${_.isNumber(data) ? data : `'${data}'`}`
						}).join(' OR ')
					);
				}
			}
		});

		// todo there is an issue with data (users, groups) which do not have record in metadata_changes table, no data will be returned
		// where.push(`"mc"."action" = 'create'`);

		if (this._checkPermissions) {
			where.push(`"${this._tableName}"."key"::TEXT IN (SELECT resource_id FROM "${config.pgSchema.data}"."permissions" WHERE user_id = ${user.id} AND permission = '${Permission.READ}' AND resource_type = '${this._tableName}' UNION SELECT resource_id FROM "${config.pgSchema.data}"."group_permissions" WHERE group_id IN (${_.map(user.groups, 'id').join(', ')}) AND permission = '${Permission.READ}' AND resource_type = '${this._tableName}')`);
		}

		if (where.length) {
			sql.push(`WHERE ${where.join(' AND ')}`);
		}

		sql.push(`GROUP BY "${this._tableName}"."key"`);

		if (this._dataSources) {
			_.each(this._dataSources, (dataSource) => {
				_.each(dataSource.getRelevantColumns(), (relevantColumn) => {
					sql.push(`, "${dataSource.getTableName()}"."${relevantColumn}"`);
				});
			});
		}

		if (request.order) {
			sql.push(`ORDER BY`);

			_.map(request.order, ([key, order]) => {
				let direction = order && order.toLowerCase() === "descending" ? "DESC" : "ASC";
				sql.push(`"${key}" ${direction}`);
			});
		} else {
			sql.push(`ORDER BY created`);
		}

		if (limit) {
			sql.push(`LIMIT ${limit}`);
		}

		if (offset) {
			sql.push(`OFFSET ${offset}`);
		}

		return sql.join(' ');
	}

	getSchemaForTypes(types) {
		return this._pgPool.query(`SELECT table_schema AS schema, table_name AS type FROM information_schema.tables WHERE table_name in ('${types.join(`', '`)}')`)
			.then((queryResult) => {
				return queryResult.rows;
			})
	}

	getAvailableResourceKeyByResourceTypesForUser(resourceTypes, user) {
		let userId = user.id;
		let userGroupIds = _.map(user.groups, 'id');

		return this.getSchemaForTypes(resourceTypes)
			.then((schemaTypes) => {
				console.log(schemaTypes);
			});
	}

	postgresGet(request, user, extra, isAdmin) {
		let payload = {};
		return Promise.resolve()
			.then(() => {
				let limit, offset;
				if (!request.unlimited) {
					payload.limit = _.isNumber(request.limit) && request.limit || this._limit;
					payload.offset = _.isNumber(request.offset) && request.offset || this._offset;

					limit = payload.limit;
					offset = payload.offset;
				}
				let sql = this.getSql(request, user, extra, isAdmin, limit, offset);
				return this._pgPool.query(sql)
					.then((queryResult) => {
						return queryResult;
					})
			})
			.then((queryResult) => {
				payload.total = queryResult.rows.length ? Number(queryResult.rows[0].total) : 0;

				if (this._dataSources) {
					return _.map(queryResult.rows, (row) => {
						let filteredRow = {};

						_.each(row, (value, property) => {
							if (!property.startsWith(`#`) || property.startsWith(`#${row.type}#`)) {
								property = property.replace(`#${row.type}#`, ``);
								filteredRow[property] = value;
							}
						});

						return filteredRow;
					});
				} else {
					return queryResult.rows;
				}
			})
			.then((rows) => {
				if (extra.idOnly) {
					let possibleRelations = this._pgMetadataRelations ? this._pgMetadataRelations.getMetadataTypeKeyColumnNames() : [];
					let requestedKeys = _.map(rows, `key`);
				}
				payload.data = _.map(rows, (row) => {
					return this.parsePostgresRow(row);
				});
				return payload;
			});
	}

	populateData(payloadData, user) {
		if (this._legacy) {
			return payloadData;
		} else {
			if (payloadData.hasOwnProperty(this._groupName) && payloadData[this._groupName].length) {
				let payloadDataFiltered = _.filter(payloadData[this._groupName], (data) => {
					return data.key && !data.message;
				});
				return Promise.resolve()
					.then(() => {
						if (this._pgMetadataRelations) {
							let baseKeys = _.map(payloadData[this._groupName], `key`);
							let possibleRelationColumnNames = this._pgMetadataRelations.getMetadataTypeKeyColumnNames();
							let defaultModelRelations = {};
							_.each(possibleRelationColumnNames, (possibleRelationColumnName) => {
								defaultModelRelations[possibleRelationColumnName] = null;
							});
							return this._pgMetadataRelations
								.getRelationsForBaseKeys(baseKeys)
								.then((relations) => {
									_.each(payloadData[this._groupName], (model) => {
										let modelRelations = {
											...defaultModelRelations
										};

										if (relations && relations.hasOwnProperty(model.key)) {
											modelRelations = {
												...modelRelations,
												...relations[model.key]
											}
										}

										model.data = {
											...model.data,
											...modelRelations
										}
									})
								})
						}
					});
			}
		}
	}

	setAllPermissionsToResourceForUser(resourceKey, user) {
		let promises = [];

		if (this._basePermissionResourceType) {
			if (user.id) {
				promises.push(this._pgPermissions.add(user.id, this._basePermissionResourceType, resourceKey, Permission.CREATE));
				promises.push(this._pgPermissions.add(user.id, this._basePermissionResourceType, resourceKey, Permission.READ));
				promises.push(this._pgPermissions.add(user.id, this._basePermissionResourceType, resourceKey, Permission.UPDATE));
				promises.push(this._pgPermissions.add(user.id, this._basePermissionResourceType, resourceKey, Permission.DELETE));
			} else {
				promises.push(this._pgPermissions.addGroup(this._publicGroupId, this._basePermissionResourceType, resourceKey, Permission.READ));
			}
		}

		return Promise.all(promises);
	}

	setAdditionalPermissionToResource(resourceKey, user) {
		return Promise.resolve();
	}

	setRelatedStores(stores) {
		this._relatedMetadataStores = _.concat(this._relatedMetadataStores, stores);
		if (this._relatedMetadataStores.length) {
			this._pgMetadataRelations = new PgMetadataRelations(this._pgPool, config.pgSchema.relations, this, this._relatedMetadataStores);
		}
	}

	getKeyColumnType() {
		return this._keyType;
	}

	getTableSql() {
		return null;
	}

	getTableName() {
		return this._tableName;
	}

	getCollectionName() {
		return this._collectionName
	}

	getGroupName() {
		return this._groupName;
	}

	isAllowMultipleRelations() {
		return this._allowMultipleRelations;
	}
}

module.exports = PgCollection;