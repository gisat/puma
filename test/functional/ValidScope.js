let Periods = require('../../metadata/MongoPeriods');
let Scopes = require('../../metadata/MongoScopes');
let Locations = require('../../metadata/MongoLocations');
let Themes = require('../../metadata/MongoThemes');
let LayerTemplates = require('../../layers/MongoLayerTemplates');
let Topics = require('../../metadata/MongoTopics');
let AttributeSets = require('../../attributes/MongoAttributeSets');
let Attributes = require('../../attributes/MongoAttributes');

let MongoAttribute = require('../../attributes/MongoAttribute');
let MongoAttributeSet = require('../../attributes/MongoAttributeSet');
let MongoLayerTemplate = require('../../layers/MongoLayerTemplate');
let MongoPeriod = require('../../metadata/MongoPeriod');
let MongoScope = require('../../metadata/MongoScope');

/**
 * It creates valid scope with all relevant dependencies. It provides default for all the information necessary for the
 * scope
 */
class ValidScope {
	constructor(connection) {
		this._connection = connection;

		this._attributes = new Attributes(connection);
		this._attributeSets = new AttributeSets(connection);
		this._topics = new Topics(connection);
		this._layerTemplates = new LayerTemplates(connection);
		this._themes = new Themes(connection);
		this._locations = new Locations(connection);
		this._periods = new Periods(connection);
		this._scopes = new Scopes(connection)
	}

	/**
	 * It creates the scope and all relevant dependencies.
	 * Scope (Name)
	 *   - Location (Name)
	 *   - Theme (Name)
	 *   - Layer Template (Administrative unit) (Name)
	 *
	 *   - Topic (Name)
	 *     - Attribute Set (Name)
	 *       - Attribute (Name)
	 *       - Attribute (Name)
	 */
	create(startId) {
		let attribute1Id = ++startId;
		let attribute2Id = ++attribute1Id;
		let attributeSetId = ++attribute2Id;
		let topicId = ++attributeSetId;
		let layerTemplateId = ++topicId;
		let themeId = ++layerTemplateId;
		let locationId = ++themeId;
		let periodId = ++locationId;
		let scopeId = ++periodId;

		return this._attributes.add({
			"_id": attribute1Id,
			"name": "Urban",
			"type": "numeric",
			"standardUnits": 'km2',
			"color": "#880000"
		}).then(() => {
			return this._attributes.add({
				"_id": attribute2Id,
				"name": "Urban",
				"type": "numeric",
				"standardUnits": 'km2',
				"color": "#000000"
			})
		}).then(() => {
			return this._attributeSets.add({
				"_id": attributeSetId,
				"name": "Some Name",
				"attributes": [attribute1Id, attribute2Id],
				"featureLayers": [],
				"topic": topicId
			})
		}).then(() => {
			return this._topics.add({
				"_id": topicId,
				"name": "Some Name"
			})
		}).then(() => {
			return this._themes.add({
				"_id": themeId,
				"active": true,
				"name": "Some Name",
				"years": [periodId],
				"topics": [topicId],
				"prefTopics": [],
				"dataset": scopeId
			})
		}).then(() => {
			return this._layerTemplates.add({
				"_id": layerTemplateId,
				"active": true,
				"layerType": "au",
				"name": "Administrative Unit",
				"symbologies": [],
				"layerGroup": null,
				"topic": null
			})
		}).then(() => {
			return this._periods.add({
				"_id": periodId,
				"name": 2012
			})
		}).then(() => {
			return this._locations.add({
				"_id": locationId,
				"active": true,
				"name": "Some Name",
				"bbox": "10,10,10,10",
				"dataset": scopeId
			})
		}).then(() => {
			return this._scopes.add({
				"_id": scopeId,
				"active": true,
				"name": "Some Name",
				"featureLayers": [layerTemplateId],
				"years": [periodId]
			})
		}).then(() => {
			return {
				scope: scopeId,
				period: periodId,
				areaTemplate: layerTemplateId,
				attributeSet: attributeSetId,
				attributes: [attribute1Id, attribute2Id]
			}
		})
	}

	verify(scope) {
		let exists = true;
		return new MongoScope(scope.scope, this._connection).json().then(result => {
			if(!result) {
				exists = false;
			}
			return new MongoPeriod(scope.period, this._connection).json();
		}).then(result => {
			if(!result) {
				exists = false;
			}
			return new MongoLayerTemplate(scope.areaTemplate, this._connection).json();
		}).then(result => {
			if(!result) {
				exists = false;
			}
			return new MongoAttributeSet(scope.attributeSet, this._connection).json();
		}).then(result => {
			if(!result) {
				exists = false;
			}
			return exists;
		})
	}
}

module.exports = ValidScope;