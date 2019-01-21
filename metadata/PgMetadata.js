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
const PgLayerGroups = require('./PgLayerGroups');
const PgLayerTemplates = require('./PgLayerTemplates');
const PgVisualizations = require('./PgVisualizations');
const PgWmsLayersLegacy = require('./PgWmsLayersLegacy');

class PgMetadata extends PgCrud {
	constructor(pgPool, pgSchema, mongo) {
		super(pgPool, pgSchema, mongo);

		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);
		this._pgLpisCases = new PgLpisCases(pgPool, pgSchema, mongo);
		this._pgScopes = new PgScopes(pgPool, pgSchema, mongo);
		this._pgThemes = new PgThemes(pgPool, pgSchema, mongo);
		this._pgPlaces = new PgPlaces(pgPool, pgSchema, mongo);
		this._pgPeriods = new PgPeriods(pgPool, pgSchema, mongo);
		this._pgAttributeSets = new PgAttributeSets(pgPool, pgSchema, mongo);
		this._pgAttributes = new PgAttributes(pgPool, pgSchema, mongo);
		this._pgTopics = new PgTopics(pgPool, pgSchema, mongo);
		this._pgDataviewsLegacy = new PgDataviewsLegacy(pgPool, pgSchema, mongo);
		this._pgLpisCheckCases = new PgLpisCheckCases(pgPool, pgSchema, mongo);
		this._pgLayerGroups = new PgLayerGroups(pgPool, pgSchema, mongo);
		this._pgLayerTemplates = new PgLayerTemplates(pgPool, pgSchema, mongo);
		this._pgVisualizations = new PgVisualizations(pgPool, pgSchema, mongo);
		this._pgWmsLayersLegacy = new PgWmsLayersLegacy(pgPool, pgSchema, mongo);

		this._pgScenarios.setPgScenariosCasesClass(this._pgScenarioCases);
		this._pgScenarioCases.setPgScenariosClass(this._pgScenarios);

		this._pgLpisCheckCases.setRelatedStores([this._pgPlaces, this._pgDataviewsLegacy]);

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
				store: this._pgLpisCases,
				type: PgLpisCases.tableName()
			},
			[PgScopes.groupName()]: {
				store: this._pgScopes,
				type: PgScopes.tableName()
			},
			[PgThemes.groupName()]: {
				store: this._pgThemes,
				type: PgThemes.tableName()
			},
			[PgPlaces.groupName()]: {
				store: this._pgPlaces,
				type: PgPlaces.tableName()
			},
			[PgDataviewsLegacy.groupName()]: {
				store: this._pgDataviewsLegacy,
				type: PgDataviewsLegacy.tableName()
			},
			[PgPeriods.groupName()]: {
				store: this._pgPeriods,
				type: PgPeriods.tableName()
			},
			[PgAttributeSets.groupName()]: {
				store: this._pgAttributeSets,
				type: PgAttributeSets.tableName()
			},
			[PgAttributes.groupName()]: {
				store: this._pgAttributes,
				type: PgAttributes.tableName()
			},
			[PgTopics.groupName()]: {
				store: this._pgTopics,
				type: PgTopics.tableName()
			},
			[PgLpisCheckCases.groupName()]: {
				store: this._pgLpisCheckCases,
				type: PgLpisCheckCases.tableName()
			},
			[PgLayerGroups.groupName()]: {
				store: this._pgLayerGroups,
				type: PgLayerGroups.tableName()
			},
			[PgLayerTemplates.groupName()]: {
				store: this._pgLayerTemplates,
				type: PgLayerTemplates.tableName()
			},
			[PgVisualizations.groupName()]: {
				store: this._pgVisualizations,
				type: PgVisualizations.tableName()
			},
			[PgWmsLayersLegacy.groupName()]: {
				store: this._pgWmsLayersLegacy,
				type: PgWmsLayersLegacy.tableName()
			}
		};
	}

	getGroupsByType() {
		let groupByType = {};

		_.each(this._pgTypes, (value, property) => {
			groupByType[value.type] = property;
		});

		return groupByType;
	}
}

module.exports = PgMetadata;