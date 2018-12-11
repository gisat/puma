const _ = require('lodash');

const Permission = require('../security/Permission');

const PgCrud = require('../common/PgCrud');
const PgScenarios = require('./PgScenarios');
const PgScenarioCases = require('./PgScenarioCases');
const PgLpisCases = require('./PgLpisCases');
const PgScopes = require('./PgScopes');
const PgThemes = require('./PgThemes');
const PgPlaces = require('./PgPlaces');
const PgPeriods = require('./PgPeriods');
const PgAttributeSets = require('./PgAttributeSets');
const PgAttributes = require('./PgAttributes');
const PgTopics = require('./PgTopics');
const PgDataviewsLegacy = require('./PgDataviewsLegacy');
const PgLpisCheckCases = require('./PgLpisCheckCases');

class PgMetadata extends PgCrud {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo);

		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);
		this._pgLspiCases = new PgLpisCases(pgPool, pgSchema, mongo);
		this._pgScopes = new PgScopes(pgPool, pgSchema, mongo);
		this._pgThemes = new PgThemes(pgPool, pgSchema, mongo);
		this._pgPlaces = new PgPlaces(pgPool, pgSchema, mongo);
		this._pgPeriods = new PgPeriods(pgPool, pgSchema, mongo);
		this._pgAttributeSets = new PgAttributeSets(pgPool, pgSchema, mongo);
		this._pgAttributes = new PgAttributes(pgPool, pgSchema, mongo);
		this._pgTopics = new PgTopics(pgPool, pgSchema, mongo);
		this._pgDataviewsLegacy = new PgDataviewsLegacy(pgPool, pgSchema, mongo);
		this._pgLpisCheckCases = new PgLpisCheckCases(pgPool, pgSchema);

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
				type: PgThemes.tableName()
			},
			places: {
				store: this._pgPlaces,
				type: PgPlaces.tableName()
			},
			dataviews: {
				store: this._pgDataviewsLegacy,
				type: PgDataviewsLegacy.tableName()
			},
			periods: {
				store: this._pgPeriods,
				type: PgPeriods.tableName()
			},
			attributesets: {
				store: this._pgAttributeSets,
				type: PgAttributeSets.tableName()
			},
			attributes: {
				store: this._pgAttributes,
				type: PgAttributes.tableName()
			},
			topics: {
				store: this._pgTopics,
				type: PgAttributes.tableName()
			},
			lpischeck_cases: {
				store: this._pgLpisCheckCases,
				type: PgLpisCheckCases.tableName()
			}
		};
	}
}

module.exports = PgMetadata;