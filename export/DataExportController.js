let _ = require('underscore');
let conn = require('../common/conn');

let FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoPeriods = require('../metadata/FilteredMongoPeriods');
let FilteredMongoThemes = require('../metadata/FilteredMongoThemes');
let FilteredMongoTopics = require('../metadata/FilteredMongoTopics');
let FilteredMongoAnalysis = require('../analysis/FilteredMongoAnalysis');
let FilteredMongoPerformedAnalysis = require('../analysis/FilteredMongoPerformedAnalysis');
let FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
let FilteredMongoAttributes = require('../attributes/FilteredMongoAttributes');
let FilteredMongoLayerTemplate = require('../layers/FilteredMongoLayerTemplate');
let FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
let FilteredBaseLayers = require('../layers/FilteredBaseLayers');

class DataExportController {
	constructor(app, pool) {
		this.pool = pool;
		this.mongo = conn.getMongoDb();

		app.get('/export/data/:id', this.exports.bind(this));
		app.post('/import/data', this.imports.bind(this))
	}

	exports(request, response) {
		if(!request.session.user || !request.session.user.hasPermission('export','GET')) {
			response.status(403);
			response.json({status: "Err"});
			return;
		}

		let scope, locations, years, themes, topics, attributeSets, attributes, layerTemplates, layerReferences,
			analysis, performedAnalysis;
		let topicIds, attributeSetIds, locationIds;
		let createSql, insertSql;
		return new FilteredMongoScopes({_id: request.params.id}, this.mongo).json().then((scopes => {
			if (!scopes || scopes.length) {
				throw new Error('There is no Scope with given Id');
			}
			scope = scopes[0];
			return new FilteredMongoLocations({dataset: scope._id}, this.mongo).json();
		})).then((pLocations) => {
			locations = pLocations;
			return new FilteredMongoPeriods({_id: {$in: scope.years}}, this.mongo).json();
		}).then(pYears => {
			years = pYears;
			return new FilteredMongoThemes({dataset: scope._id}, this.mongo).json();
		}).then(pThemes => {
			themes = pThemes;
			let ids = this.getIds(themes, 'topics');
			return new FilteredMongoTopics({_id: {$in: ids}}, this.mongo).json();
		}).then(pTopics => {
			topics = pTopics;
			topicIds = this.getIds(topics, '_id');
			return new FilteredMongoAttributeSets({topics: {$in: topicIds}}, this.mongo).json();
		}).then(pAttributeSets => {
			attributeSets = pAttributeSets;
			attributeSetIds = this.getIds(attributeSets, 'attributes');
			return new FilteredMongoAttributes({_id: {$in: ids}}, this.mongo).json();
		}).then(pAttributes => {
			attributes = pAttributes;
			return new FilteredMongoLayerTemplate({topic: {$in: topicIds}}, this.mongo).json();
		}).then(pLayerTemplates => {
			layerTemplates = pLayerTemplates;
			locationIds = this.getIds(locations, '_id');
			return new FilteredMongoLayerReferences({location: locationIds}, this.mongo).json();
		}).then(pLayerReferences => {
			layerReferences = pLayerReferences;
			return new FilteredMongoAnalysis({$or: [{attributeSet: {$in: attributeSetIds}}, {attributeSets: {$contains: attributeSetIds}}]}, this.mongo).json();
		}).then(pAnalysis => {
			analysis = pAnalysis;
			return new FilteredMongoPerformedAnalysis({location: {$in: locationIds}}, this.mongo).json();
		}).then(pPerformedAnalysis => {
			performedAnalysis = pPerformedAnalysis;
			// Based on the layer references retrieve the data from the postgresql. This means base_, views_
			response.json({
				mongo: {
					scope: scope,
					location: locations,
					year: years,
					theme: themes,
					topic: topics,
					attributeset: attributeSets,
					attribute: attributes,
					areatemplate: layerTemplates,
					layerref: layerReferences,
					analysis: analysis,
					performedanalysis: performedAnalysis
				},
				postgresql: {
					create: createSql,
					insertSql: insertSql
				}
			});
		})
	}

	getIds(models, key) {
		return _.uniq(_.flatten(models.map(model => model[key])))
	}

	imports(request, response, next) {
		// Load JSON from File and based on it. Expose this as endpoint, which is accessible only by admin, but which allows you to import file from URL or export file.
	}
}

module.exports = DataExportController;