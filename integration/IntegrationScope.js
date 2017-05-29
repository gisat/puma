let conn = require('../common/conn');
let logger = require('../common/Logger').applicationWideLogger;
let PgPermissions = require('../security/PgPermissions');
let Permission = require('../security/Permission');

let FilteredMongoScopes = require('../metadata/FilteredMongoScopes');
let FilteredMongoAttributes = require('../attributes/FilteredMongoAttributes');
let FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
let FilteredMongoThemes = require('../metadata/FilteredMongoThemes');

let MongoScope = require('../metadata/MongoScope');
let MongoTopic = require('../metadata/MongoTopic');

let MongoPeriods = require('../metadata/MongoPeriods');
let MongoLayerTemplates = require('../layers/MongoLayerTemplates');
let MongoScopes = require('../metadata/MongoScopes');
let MongoThemes = require('../metadata/MongoThemes');
let MongoTopics = require('../metadata/MongoTopics');
let MongoAttributeSets = require('../attributes/MongoAttributeSets');
let MongoAttributes = require('../attributes/MongoAttributes');

/**
 * It verifies existence of the Scope to be used for integration of new dataset. If there is none such it can also create such Scope
 * with all dependencies.
 */
class IntegrationScope {
	constructor(mongo, pgPool, schema, user, scope, period) {
		this._mongo = mongo;
		this._pgPool = pgPool;

		this._year = period || 2015;
		this._scope = scope || 'Global Urban Footprint';
		this._administrativeUnit = 'Patches';
		this._user = user;

		this._permissions = new PgPermissions(pgPool, schema);

		this._periods = new MongoPeriods(this._mongo);
		this._layerTemplates = new MongoLayerTemplates(this._mongo);
		this._scopes = new MongoScopes(this._mongo);
		this._themes = new MongoThemes(this._mongo);
		this._topics = new MongoTopics(this._mongo);
		this._attributeSets = new MongoAttributeSets(this._mongo);
		this._attributes = new MongoAttributes(this._mongo);

		logger.info(`IntegrationScope#constructor Parameters: Schema: ${schema} Scope: ${scope} Period: ${period} User: `, user);
	}

	json() {
		return this.exists().then(exists => {
			if(!exists) {
				return this.create();
			} else {
				return this.scope();
			}
		});
	}

	exists() {
		return new FilteredMongoScopes({name: this._scope}, this._mongo).json().then(results => {
			results = results.filter(result => this._user.hasPermission(MongoScope.collectionName(), Permission.UPDATE, result._id));

			return results.length > 0;
		});
	}

	create() {
		let scopeId = conn.getNextId();
		let periodId = conn.getNextId();
		let areaTemplateId = conn.getNextId();
		let attributeSetId = conn.getNextId();
		let topicId = conn.getNextId();
		let urbanAttributeId = conn.getNextId();
		let nonUrbanAttributeId = conn.getNextId();
		let themeId = conn.getNextId();

		return this._periods.add({
			"_id": periodId,
			"name": this._year,
			"active": true
		}).then(() => {
			return this._layerTemplates.add({
				"_id": areaTemplateId,
				"active": true,
				"layerType": "au",
				"name": this._administrativeUnit,
				"symbologies": [],
				"layerGroup": null,
				"topic": null
			})
		}).then(() => {
			return this._scopes.add({
				"_id": scopeId,
				"active": true,
				"name": this._scope,
				"featureLayers": [areaTemplateId],
				"years": [periodId]
			})
		}).then(() => {
			return this._themes.add({
				"_id": themeId,
				"active": true,
				"name": this._scope,
				"years": [periodId],
				"topics": [topicId],
				"prefTopics": [],
				"dataset": scopeId
			})
		}).then(() => {
			return this._topics.add({
				"_id": topicId,
				"name": this._scope,
				"active": true
			})
		}).then(() => {
			return this._attributeSets.add({
				"_id": attributeSetId,
				"active": true,
				"name": this._scope,
				"attributes": [urbanAttributeId, nonUrbanAttributeId],
				"featureLayers": [],
				"topic": topicId
			})
		}).then(() => {
			return new FilteredMongoAttributes({name: 'Urban'}, this._mongo).json().then(attributes => {
				if(attributes.length === 0) {
					return this._attributes.add([{
						"_id": urbanAttributeId,
						"name": "Urban",
						"active": true,
						"type": "numeric",
						"standardUnits": 'km2',
						"units": 'km2',
						"color": "#880000"
					}])
				} else {
					urbanAttributeId = attributes[0]._id;
				}
			});
		}).then(() => {
			return new FilteredMongoAttributes({name: 'Non Urban'}, this._mongo).json().then(attributes => {
				if(attributes.length === 0) {
					return this._attributes.add([{
						"_id": nonUrbanAttributeId,
						"name": "Non Urban",
						"active": true,
						"type": "numeric",
						"standardUnits": 'km2',
						"units": 'km2',
						"color": "#000000"
					}])
				} else {
					nonUrbanAttributeId = attributes[0]._id;
				}
			});
		}).then(() => {
			return Promise.all([
				this._permissions.add(this._user.id, MongoScope.collectionName(), scopeId, Permission.READ),
				this._permissions.add(this._user.id, MongoScope.collectionName(), scopeId, Permission.UPDATE),
				this._permissions.add(this._user.id, MongoScope.collectionName(), scopeId, Permission.DELETE),

				this._permissions.add(this._user.id, MongoTopic.collectionName(), topicId, Permission.READ),
				this._permissions.add(this._user.id, MongoTopic.collectionName(), topicId, Permission.UPDATE),
				this._permissions.add(this._user.id, MongoTopic.collectionName(), topicId, Permission.DELETE)
			]);
		}).then(() => {
			return {
				scope: scopeId,
				period: periodId,
				theme: themeId,
				areaTemplate: areaTemplateId,
				attributeSet: attributeSetId,
				attributes: {
					urban: urbanAttributeId,
					nonUrban: nonUrbanAttributeId
				}
			};
		});
	}

	scope() {
		let scopeId, periodId, areaTemplateId, themeId, urbanAttributeId, nonUrbanAttributeId, attributeSetId;
		return new FilteredMongoScopes({name: this._scope}, this._mongo).json().then(results => {
			results = results.filter(result => this._user.hasPermission(MongoScope.collectionName(), Permission.UPDATE, result._id));

			scopeId = results[0]._id;
			areaTemplateId = results[0].featureLayers[0];
			periodId = results[0].years[0];

			return new FilteredMongoAttributes({name: 'Urban'}, this._mongo).json();
		}).then(urban => {
			urbanAttributeId = urban[0]._id;
			return new FilteredMongoAttributes({name: 'Non Urban'}, this._mongo).json();
		}).then(nonUrban => {
			nonUrbanAttributeId = nonUrban[0]._id;
			return new FilteredMongoAttributeSets({name: this._scope}, this._mongo).json();
		}).then(attributeSet => {
			attributeSetId = attributeSet[0]._id;
			return new FilteredMongoThemes({name: this._scope}, this._mongo).json();
		}).then(theme => {
			themeId = theme[0]._id;
			return {
				scope: scopeId,
				period: periodId,
				theme: themeId,
				areaTemplate: areaTemplateId,
				attributeSet: attributeSetId,
				attributes: {
					urban: urbanAttributeId,
					nonUrban: nonUrbanAttributeId
				}
			}
		});
	}
}

module.exports = IntegrationScope;