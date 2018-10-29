const _ = require('lodash');

const Permission = require('../security/Permission');

class PgCrud {
	constructor(pgPool, pgSchema, mongo) {
		this._pgTypes = {
		};
	}

	async create(data, user, extra) {
		let errors;

		for (let type of Object.keys(data)) {
			if (this._pgTypes.hasOwnProperty(type)) {
				if (!user.hasPermission(this._pgTypes[type].type, Permission.CREATE, null)) {
					throw new Error('Forbidden');
				}
			}
		}

		for (let type of Object.keys(data)) {
			if (this._pgTypes.hasOwnProperty(type)) {
				await this._pgTypes[type].store.create(data, user, extra)
					.catch((error) => {
						data[type] = [];
						errors = errors || {};
						errors[type] = {
							success: false,
							message: error.message
						};
					})
			} else {
				delete data[type];
			}
		}

		for (let type of Object.keys(data)) {
			if (this._pgTypes.hasOwnProperty(type)) {
				await this._pgTypes[type].store.populateData(data, user);
			} else {
				delete data[type];
			}
		}
		return [data, errors];
	}

	async get(types, request, user) {
		let promises = [];
		let payload = {
			data: {}
		};

		types = types ? types.split(',') : [];

		_.forEach(this._pgTypes, (pgObject, pgType) => {
			if (types.includes(pgType)) {
				promises.push(
					pgObject.store.get(request, user, {idOnly: true})
						.then((results) => {
							payload.data[pgType] = results['data'];
							payload.changes = {
								...payload.changes,
								[pgType]: results['change']
							};

							if (_.isUndefined(payload['limit'])) {
								payload['limit'] = results['limit'];
							}
							if (_.isUndefined(payload['offset'])) {
								payload['offset'] = results['offset'];
							}
							if (_.isUndefined(payload['total'])) {
								payload['total'] = results['total'];
							}

							return pgObject.store.populateData(payload.data, user);
						})
						.catch((error) => {
							console.log(error);
							payload.data[pgType] = [];
							payload.errors = payload.errors || {};
							payload.errors[pgType] = error.message;
						})
				)
			}
		});

		return await Promise.all(promises)
			.then(() => {
				return payload;
			});
	}

	async update(data, user, extra) {
		for (let type of Object.keys(data)) {
			if (this._pgTypes.hasOwnProperty(type)) {
				await this._pgTypes[type].store.update(data, user, extra);
			} else {
				delete data[type];
			}
		}

		for (let type of Object.keys(data)) {
			if (this._pgTypes.hasOwnProperty(type)) {
				await this._pgTypes[type].store.populateData(data, user);
			} else {
				delete data[type];
			}
		}
		return data;
	}

	async delete(data, user) {
		for (let type of Object.keys(data)) {
			if (this._pgTypes.hasOwnProperty(type)) {
				await this._pgTypes[type].store.delete(data, user);
			} else {
				delete data[type];
			}
		}

		return data;
	}
}

module.exports = PgCrud;