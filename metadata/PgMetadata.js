const _ = require('lodash');

const PgCollection = require('../common/PgCollection');
const PgScenarios = require('./PgScenarios');
const PgScenarioCases = require('./PgScenarioCases');

class PgMetadata extends PgCollection {
	constructor(pgPool, pgSchema) {
		super(pgPool, pgSchema);

		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);

		this._pgScenarios.setPgScenariosCasesClass(this._pgScenarioCases);
		this._pgScenarioCases.setPgScenariosClass(this._pgScenarios);
	}

	async create(data) {
		let promises = [];

		for(let metadataType of Object.keys(data)) {
			switch (metadataType) {
				case 'scenarios':
					await this._pgScenarios.create(data);
					break;
				case 'scenario_cases':
					await this._pgScenarioCases.create(data);
					break;
				default:
					delete data[metadataType];
					break;
			}
		}

		return data;
	}

	get(filter) {
		return Promise.resolve();
	}

	update(data) {
		return Promise.resolve();
	}

	delete(data) {
		return Promise.resolve();
	}
}

module.exports = PgMetadata;