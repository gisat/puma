const _ = require('lodash');

const Permission = require('../security/Permission');

const PgCollection = require('../common/PgCollection');
const PgScenarios = require('./PgScenarios');
const PgScenarioCases = require('./PgScenarioCases');
const PgLpisCases = require('./PgLpisCases');
const PgScopes = require('./PgScopes');
const PgThemes = require('./PgThemes');

class PgMetadata extends PgCollection {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo, 'PgMetadata');

		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);
		this._pgLspiCases = new PgLpisCases(pgPool, pgSchema, mongo);
		this._pgScopes = new PgScopes(pgPool, pgSchema, mongo);
		this._pgThemes = new PgThemes(pgPool, pgSchema, mongo);

		this._pgScenarios.setPgScenariosCasesClass(this._pgScenarioCases);
		this._pgScenarioCases.setPgScenariosClass(this._pgScenarios);

		this._metadataTypes = {
			scenarios: {
				store: this._pgScenarios,
				type: "scenario"
			},
			scenario_cases: {
				store: this._pgScenarioCases,
				type: "scenario_case"
			},
			lpis_cases: {
				store: this._pgLspiCases,
				type: "lpis_case"
			},
			scopes: {
				store: this._pgScopes,
				type: 'scope'
			},
			themes: {
				store: this._pgThemes,
				type: 'theme'
			}
		};
	}

	async create(data, user, extra) {
		let errors;

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				if (!user.hasPermission(this._metadataTypes[metadataType].type, Permission.CREATE, null)) {
					throw new Error('Forbidden');
				}
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.create(data, user, extra)
					.catch((error) => {
						data[metadataType] = [];
						errors = errors || {};
						errors[metadataType] = {
							success: false,
							message: error.message
						};
					})
			} else {
				delete data[metadataType];
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.populateData(data, user);
			} else {
				delete data[metadataType];
			}
		}
		return [data, errors];
	}

	async get(types, filter, user) {
		let promises = [];
		let payload = {
			data: {}
		};

		types = types ? types.split(',') : [];

		_.forEach(this._metadataTypes, (metadataObject, metadataType) => {
			if (types.includes(metadataType)) {
				promises.push(
					metadataObject.store.get(filter, user, {idOnly: true})
						.then((results) => {
							payload.data[metadataType] = results['data'];
							payload.changes = results['changes'];
							if (_.isUndefined(payload['limit'])) {
								payload['limit'] = results['limit'];
							}
							if (_.isUndefined(payload['offset'])) {
								payload['offset'] = results['offset'];
							}
							if (_.isUndefined(payload['total'])) {
								payload['total'] = results['total'];
							}
							return metadataObject.store.populateData(payload.data, user);
						})
						.catch((error) => {
							payload.data[metadataType] = [];
							payload.errors = payload.errors || {};
							payload.errors[metadataType] = {
								success: false,
								message: error.message
							};
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
		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.update(data, user, extra);
			} else {
				delete data[metadataType];
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.populateData(data, user);
			} else {
				delete data[metadataType];
			}
		}
		return data;
	}

	async delete(data, user) {
		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.delete(data, user);
			} else {
				delete data[metadataType];
			}
		}

		return data;
	}
}

module.exports = PgMetadata;