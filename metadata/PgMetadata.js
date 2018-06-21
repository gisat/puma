const _ = require('lodash');

const Permission = require('../security/Permission');

const PgCollection = require('../common/PgCollection');
const PgScenarios = require('./PgScenarios');
const PgScenarioCases = require('./PgScenarioCases');

class PgMetadata extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema, 'PgMetadata');

		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);

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
			}
		};
	}

	async create(data, user) {
		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				if (!user.hasPermission(this._metadataTypes[metadataType].type, Permission.CREATE, null)) {
					throw new Error('Forbidden');
				}
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.create(data, user);
			} else {
				delete data[metadataType];
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.populateData(data);
			} else {
				delete data[metadataType];
			}
		}
		return data;
	}

	async get(types, filter, user) {
		let promises = [];

		types = types ? types.split(',') : [];

		for (let metadataType of types) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				if (!user.hasPermission(this._metadataTypes[metadataType].type, Permission.READ, null)) {
					throw new Error('Forbidden');
				}
			}
		}

		_.forEach(this._metadataTypes, (metadataObject, metadataType) => {
			if (types.includes(metadataType)) {
				promises.push(
					metadataObject.store.get(filter)
						.then((results) => {
							return {
								type: metadataType,
								data: results
							}
						})
						.catch(() => {
							return {
								type: metadataType,
								data: []
							}
						})
				)
			}
		});

		return await Promise.all(promises)
			.then((results) => {
				let data = {};

				results.forEach((result) => {
					data[result.type] = result.data;
				});

				return {
					data: data
				}
			});
	}

	async update(data, user) {
		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				if (!user.hasPermission(this._metadataTypes[metadataType].type, Permission.UPDATE, null)) {
					throw new Error('Forbidden');
				}
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.update(data);
			} else {
				delete data[metadataType];
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.populateData(data);
			} else {
				delete data[metadataType];
			}
		}
		return data;
	}

	async delete(data, user) {
		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				if (!user.hasPermission(this._metadataTypes[metadataType].type, Permission.DELETE, null)) {
					throw new Error('Forbidden');
				}
			}
		}

		for (let metadataType of Object.keys(data)) {
			if (this._metadataTypes.hasOwnProperty(metadataType)) {
				await this._metadataTypes[metadataType].store.delete(data);
			} else {
				delete data[metadataType];
			}
		}

		return data;
	}
}

module.exports = PgMetadata;