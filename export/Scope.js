let _ = require('underscore');
let Promise = require('promise');
let childProcess = require('pn/child_process');
let config = require('../config');

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

let MongoScopes = require('../metadata/MongoScopes');
let MongoLocations = require('../metadata/MongoLocations');
let MongoPeriods = require('../metadata/MongoPeriods');
let MongoThemes = require('../metadata/MongoThemes');
let MongoTopics = require('../metadata/MongoTopics');
let MongoAnalysis = require('../analysis/MongoAnalysis');
let MongoPerformedAnalysis = require('../analysis/MongoPerformedAnalysis');
let MongoAttributeSets = require('../attributes/MongoAttributeSets');
let MongoAttributes = require('../attributes/MongoAttributes');
let MongoLayerTemplates = require('../layers/MongoLayerTemplates');
let MongoLayerReferences = require('../layers/MongoLayerReferences');

let PgTable = require('../data/PgTable');

class Scope {
	constructor(pool, mongoDb, schemaMap) {
		this.pool = pool;
		this.mongo = mongoDb;
		this.schemaMap = schemaMap;
	}

	// TODO: Split
	exports(id) {
		let scope, locations, years, themes, topics, attributeSets, attributes, layerTemplates, layerReferences,
			analysis, performedAnalysis;
		let topicIds, attributeSetIds, locationIds;
		return new FilteredMongoScopes({_id: id}, this.mongo).json().then((scopes => {
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
			let layers = layerReferences.map(reference => reference.layer);
			let analysisLayerNames = layers
				.filter(layer => layer.indexOf('analysis') == 0)
				.map(layer => layer.replace("analysis:", `${this.schemaMap['analysis']}.`));
			let sourceTablesNames = layers
				.filter(layer => layer.indexOf('geonode') == 0)
				.map(layer => layer.replace("geonode:", `${this.schemaMap['geonode']}.`));
			let baseLayersIds = layerReferences
				.filter(reference => !reference.isData)
				.map(reference => reference._id); // This represents the tables starting with base_
			let baseLayersNames = baseLayersIds.map(id => `${this.schemaMap['views']}.base_${id}`);
			// FilteredBaseLayer can help with creation of the layer.
			let getSql = this.getSqlForTable.bind(this);
			let sourcePromises = sourceTablesNames.map(getSql);
			let analysesPromises = analysisLayerNames.map(getSql);
			let baseLayersPromises = baseLayersNames.map(getSql);
			let promises = sourcePromises.concat(analysesPromises).concat(baseLayersPromises);
			return Promise.all(promises);
		}).then(() => {
			return {
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
					sql: this.sql
				}
			};
		})
	}

	// TODO: Correctly handle the failures.
	imports(json) {
		let mongo = json.mongo;
		let promises = [];
		promises.push(new MongoScopes(this.mongo).add(mongo.scope));
		promises.push(this.importAllFromType(new MongoLocations(this.mongo), mongo.location));
		promises.push(this.importAllFromType(new MongoPeriods(this.mongo), mongo.year));
		promises.push(this.importAllFromType(new MongoThemes(this.mongo), mongo.theme));
		promises.push(this.importAllFromType(new MongoTopics(this.mongo), mongo.topic));
		promises.push(this.importAllFromType(new MongoAttributeSets(this.mongo), mongo.attributeset));
		promises.push(this.importAllFromType(new MongoAttributes(this.mongo), mongo.attribute));
		promises.push(this.importAllFromType(new MongoLayerTemplates(this.mongo), mongo.areatemplate));
		promises.push(this.importAllFromType(new MongoLayerReferences(this.mongo), mongo.layerref));
		promises.push(this.importAllFromType(new MongoAnalysis(this.mongo), mongo.analysis));
		promises.push(this.importAllFromType(new MongoPerformedAnalysis(this.mongo), mongo.performedanalysis));

		promises.push(this.pool.pool().query(json.postgresql.sql));
		// TODO: Also create the data views on top of the data.

		return Promise.all(promises);

	}

	importAllFromType(type, all) {
		return all.map(item => {
			type.add(item);
		})
	}

	getSqlForTable(tableName) {
		return new PgTable(tableName).asSql().then(sql => {
			this.sql += sql;
			return sql;
		});
	}

	getIds(models, key) {
		return _.uniq(_.flatten(models.map(model => model[key])))
	}
}

module.exports = Scope;