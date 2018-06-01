const _ = require('lodash');

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
			scenarios: this._pgScenarios,
			scenario_cases: this._pgScenarioCases
		}
	}

	async create(data) {
		for(let metadataType of Object.keys(data)) {
			if(this._metadataTypes.hasOwnProperty(metadataType))  {
				await this._metadataTypes[metadataType].create(data);
			} else {
				delete data[metadataType];
			}
		}

		for(let metadataType of Object.keys(data)) {
			if(this._metadataTypes.hasOwnProperty(metadataType))  {
				await this._metadataTypes[metadataType].populateData(data);
			} else {
				delete data[metadataType];
			}
		}
		return data;
	}

	get(types, filter) {
		let promises = [];

		types = types.split(',');

		_.forEach(this._metadataTypes, (metadataClass, metadataType) => {
			if(types.includes(metadataType)) {
				promises.push(
					metadataClass.get(filter)
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

		return Promise.all(promises)
			.then((results) => {
				let data = {

				};

				results.forEach((result) => {
					data[result.type] = result.data;
				});

				return {
					data: data
				}
			});
	}

	update(data) {
		return Promise.resolve();
	}

	delete(data) {
		return Promise.resolve();
	}
}

module.exports = PgMetadata;