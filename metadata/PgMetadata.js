const _ = require('lodash');

const Permission = require('../security/Permission');

const PgCrud = require('../common/PgCrud');
const PgScenarios = require('./PgScenarios');
const PgScenarioCases = require('./PgScenarioCases');
const PgLpisCases = require('./PgLpisCases');
const PgScopes = require('./PgScopes');
const PgThemes = require('./PgThemes');

class PgMetadata extends PgCrud {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo);

		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);
		this._pgLspiCases = new PgLpisCases(pgPool, pgSchema, mongo);
		this._pgScopes = new PgScopes(pgPool, pgSchema, mongo);
		this._pgThemes = new PgThemes(pgPool, pgSchema, mongo);

		this._pgScenarios.setPgScenariosCasesClass(this._pgScenarioCases);
		this._pgScenarioCases.setPgScenariosClass(this._pgScenarios);

		this._pgTypes = {
			scenarios: {
				store: this._pgScenarios,
				type: PgScenarios.tableName()
			},
			scenario_cases: {
				store: this._pgScenarioCases,
				type: PgScenarioCases.tableName()
			},
			lpis_cases: {
				store: this._pgLspiCases,
				type: PgLpisCases.tableName()
			},
			scopes: {
				store: this._pgScopes,
				type: PgScopes.tableName()
			},
			themes: {
				store: this._pgThemes,
				type: PgThemes.groupName()
			}
		};
	}
}

module.exports = PgMetadata;