const _ = require('lodash');

const Permission = require('../security/Permission');

const PgCrud = require('../common/PgCrud');
const PgScenarios = require('./PgScenarios');
const PgCases = require('./PgCases');
const PgScopes = require('./PgScopes');
const PgPlaces = require('./PgPlaces');
const PgPeriods = require('./PgPeriods');
const PgAttributeSets = require('./PgAttributeSets');
const PgAttributes = require('./PgAttributes');
const PgLayerTemplates = require('./PgLayerTemplates');
const PgAreaTree = require('./PgAreaTree');
const PgAreaTreeLevel = require('./PgAreaTreeLevel');
const PgViews = require('./PgViews');

const PgScenariosLegacy = require('./PgScenariosLegacy');
const PgScenarioCases = require('./PgScenarioCases');
const PgLpisCases = require('./PgLpisCases');
const PgThemes = require('./PgThemes');
const PgTopics = require('./PgTopics');
const PgDataviewsLegacy = require('./PgDataviewsLegacy');
const PgLpisCheckCases = require('./PgLpisCheckCases');
const PgLayerGroups = require('./PgLayerGroups');
const PgVisualizations = require('./PgVisualizations');
const PgWmsLayersLegacy = require('./PgWmsLayersLegacy');

class PgMetadata extends PgCrud {
	constructor(pgPool, pgSchema) {
		super();

		// this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		// this._pgScenarioCases = new PgScenarioCases(pgPool, pgSchema);
		// this._pgLpisCases = new PgLpisCases(pgPool, pgSchema);
		// this._pgLpisCheckCases = new PgLpisCheckCases(pgPool, pgSchema);

		this._pgScopes = new PgScopes(pgPool, pgSchema);
		this._pgPlaces = new PgPlaces(pgPool, pgSchema);
		this._pgPeriods = new PgPeriods(pgPool, pgSchema);
		this._pgAttributeSets = new PgAttributeSets(pgPool, pgSchema);
		this._pgAttributes = new PgAttributes(pgPool, pgSchema);
		this._pgLayerTemplates = new PgLayerTemplates(pgPool, pgSchema);
		this._pgScenarios = new PgScenarios(pgPool, pgSchema);
		this._pgCases = new PgCases(pgPool, pgSchema);
		this._pgAreaTree = new PgAreaTree(pgPool, pgSchema);
		this._pgAreaTreeLevel = new PgAreaTreeLevel(pgPool, pgSchema);
		this._pgViews = new PgViews(pgPool, pgSchema);

		this._PgDataSource = null;

		this._pgAreaTree.setRelatedStores([this._pgScopes]);
		this._pgAreaTreeLevel.setRelatedStores([this._pgAreaTree]);

		// this._pgLayerGroups = new PgLayerGroups(pgPool, pgSchema);

		// this._pgScenarios.setPgScenariosCasesClass(this._pgScenarioCases);
		// this._pgScenarioCases.setPgScenariosClass(this._pgScenarios);

		// this._pgLpisCheckCases.setRelatedStores([this._pgPlaces, this._pgDataviewsLegacy]);

		this._pgTypes = {
			[PgScenarios.groupName()]: {
				store: this._pgScenarios,
				type: PgScenarios.tableName()
			},
			[PgCases.groupName()]: {
				store: this._pgCases,
				type: PgCases.tableName()
			},
			[PgScopes.groupName()]: {
				store: this._pgScopes,
				type: PgScopes.tableName()
			},
			[PgPlaces.groupName()]: {
				store: this._pgPlaces,
				type: PgPlaces.tableName()
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
			[PgLayerTemplates.groupName()]: {
				store: this._pgLayerTemplates,
				type: PgLayerTemplates.tableName()
			},
			[PgAreaTree.groupName()]: {
				store: this._pgAreaTree,
				type: PgAreaTree.tableName()
			},
			[PgAreaTreeLevel.groupName()]: {
				store: this._pgAreaTreeLevel,
				type: PgAreaTreeLevel.tableName()
			},
			[PgViews.groupName()]: {
				store: this._pgViews,
				type: PgViews.tableName()
			},
			// scenarios: {
			// 	store: this._pgScenarios,
			// 	type: PgScenarios.tableName()
			// },
			// scenario_cases: {
			// 	store: this._pgScenarioCases,
			// 	type: PgScenarioCases.tableName()
			// },
			// lpis_cases: {
			// 	store: this._pgLpisCases,
			// 	type: PgLpisCases.tableName()
			// },
			// [PgThemes.groupName()]: {
			// 	store: this._pgThemes,
			// 	type: PgThemes.tableName()
			// },
			// [PgDataviewsLegacy.groupName()]: {
			// 	store: this._pgDataviewsLegacy,
			// 	type: PgDataviewsLegacy.tableName()
			// },
			// [PgTopics.groupName()]: {
			// 	store: this._pgTopics,
			// 	type: PgTopics.tableName()
			// },
			// [PgLpisCheckCases.groupName()]: {
			// 	store: this._pgLpisCheckCases,
			// 	type: PgLpisCheckCases.tableName()
			// },
			// [PgLayerGroups.groupName()]: {
			// 	store: this._pgLayerGroups,
			// 	type: PgLayerGroups.tableName()
			// },
			// [PgVisualizations.groupName()]: {
			// 	store: this._pgVisualizations,
			// 	type: PgVisualizations.tableName()
			// },
			// [PgWmsLayersLegacy.groupName()]: {
			// 	store: this._pgWmsLayersLegacy,
			// 	type: PgWmsLayersLegacy.tableName()
			// }
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