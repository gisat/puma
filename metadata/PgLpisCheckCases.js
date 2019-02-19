const PgCollection = require('../common/PgCollection');
const PgDataViewLegacy = require(`./PgDataviewsLegacy`);
const PgLpisCases = require(`./PgLpisCases`);
const ImageMosaic = require(`../geoserver/ImageMosaic`);

const config = require(`../config`);
const conn = require(`../common/conn`);

class PgLpisCheckCases extends PgCollection {
	constructor(pool, schema, mongo) {
		super(pool, schema, mongo, `PgLpisCheckCases`);

		this._pgPool = pool;
		this._pgSchema = schema;

		this._imageMosaic = new ImageMosaic(
			config.dromasLpis.pathToS2Scenes,
			config.dromasLpis.pathToImageMosaicDirectory,
			config.dromasLpis.imageMosaicPgStorage,
			config.dromasLpis.groupBy,
			config.dromasLpis.enabled,
		);

		this._legacy = false;
		this._checkPermissions = false;
		this._collectionName = this.constructor.collectionName();
		this._groupName = this.constructor.groupName();
		this._tableName = this.constructor.tableName();

		this._pgLpisCases = new PgLpisCases(pool, schema, mongo);

		this._relatedMetadataStores = [];

		this._legacyDataPath = "";

		this._permissionResourceTypes = [
			this._tableName
		];

		this._customSqlColumns = `, ST_AsGeoJSON(ST_Transform(geometry, 4326), 15, 4) AS geometry`;

		this._initPgTable();
	}

	createRelated(object, createdObject, objects, user, extra) {
		return this.createRelatedDataview(object, createdObject, objects, user, extra);
	}

	createRelatedDataview(object, createdObject, objects, user, extra) {
		let scopeId, geometry, centroid, dataviewStore;
		return Promise.resolve()
			.then(() => {
				if (extra && extra.configuration && extra.configuration.scope_id) {
					scopeId = extra.configuration.scope_id;
					geometry = JSON.parse(createdObject.geometry);
					centroid = JSON.parse(createdObject.centroid);
					return this.getDataviewData(scopeId, geometry);
				}
			})
			.then((dataviewData) => {
				if (dataviewData) {
					dataviewStore = this.getDataViewStore();

					let layerPeriods = [];
					_.each(dataviewData.dates, (date) => {
						layerPeriods.push({[dataviewData.s2GetDatesLayerTemplateId]: `${date}`});
					});

					let caseDataview = this.getCaseDataview(dataviewData.placeId, dataviewData.yearIds, dataviewData.scopeId, dataviewData.themeId, centroid.coordinates[1], centroid.coordinates[0], 2000, layerPeriods);

					return dataviewStore.create({[dataviewStore.getGroupName()]: [{data: caseDataview}]}, user, extra);
				}
			})
			.then((createdDataviews) => {
				return createdDataviews[0] && createdDataviews[0].key;
			})
			.then((createdDataviewKey) => {
				if (createdDataviewKey && this._pgMetadataRelations) {
					return this._pgMetadataRelations.addRelations(createdObject.key, {[`${dataviewStore.getTableName()}_key`]: createdDataviewKey})
				}
			})
	}

	getDataviewData(scopeId, geometry) {
		let dataviewData = {
			scopeId,
			dates: []
		};
		return this._pgLpisCases._getMongoScopeById(scopeId)
			.then((mongoScopeDocument) => {
				dataviewData.s2GetDatesLayerTemplateId = mongoScopeDocument.configuration && mongoScopeDocument.configuration.lpisCheckCases && mongoScopeDocument.configuration.lpisCheckCases.s2GetDatesLayerTemplateId;
				dataviewData.ortofotoLayerTemplateId = mongoScopeDocument.configuration && mongoScopeDocument.configuration.lpisCheckCases && mongoScopeDocument.configuration.lpisCheckCases.ortofotoLayerTemplateId;
				return this._pgLpisCases._getMongoBasicDataViewParametersByScopeId(scopeId)
			})
			.then(([themeId, yearId, placeId, yearIds]) => {
				dataviewData.themeId = themeId;
				dataviewData.yearId = yearId;
				dataviewData.placeId = placeId;
				dataviewData.yearIds = yearIds;
			})
			.then(() => {
				return this._imageMosaic.getDatesByGeometry(geometry);
			})
			.then((datesForGeometry) => {
				if (datesForGeometry.length <= 6) {
					for (let i = 0; i < 6; i++) {
						dataviewData.dates.push(datesForGeometry[i] || null);
					}
				} else {
					let chunkSize = Math.ceil(datesForGeometry.length / 5);
					let chunks = _.chunk(datesForGeometry, chunkSize);

					_.each(chunks, (chunk) => {
						let index = _.random(0, chunk.length - 1);
						dataviewData.dates.push(chunk[index]);
					});
				}
			})
			.then(() => {
				return dataviewData;
			})
	}

	getDataViewStore() {
		return _.find(this._relatedMetadataStores, (relatedStore) => {
			return relatedStore.getTableName() === PgDataViewLegacy.tableName();
		});
	}

	_getTableSql() {
		return `
		BEGIN;
		CREATE TABLE IF NOT EXISTS "${this._pgSchema}"."${this._tableName}" (
			id SERIAL PRIMARY KEY,
			uuid UUID DEFAULT gen_random_uuid()
		);
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS stav TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS nkod_dpb TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS kulturakod TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS poznamka TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS typ TEXT;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS geometry GEOMETRY;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS visited BOOLEAN;
		ALTER TABLE "${this._pgSchema}"."${this._tableName}" ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
		COMMIT;
		`;
	}

	getReturningSql() {
		return `id AS key, ST_AsGeoJSON(ST_Envelope(ST_Transform(geometry, 4326))) AS geometry, ST_AsGeoJSON(ST_Centroid(ST_Transform(geometry, 4326))) AS centroid`;
	}

	getCaseDataview(placeId, yearIds, scopeId, themeId, latidute, longitude, range, layerPeriods, ortofotoTemplateId) {
		let baseDataview =
			{
				"name": "",
				"conf": {
					"multipleMaps": false,
					"years": yearIds,
					"dataset": scopeId,
					"theme": themeId,
					"location": placeId,
					"is3D": true,
					"name": "Initial",
					"description": "",
					"language": "en",
					"locations": [placeId],
					"selMap": {},
					"choroplethCfg": [],
					"pagingUseSelected": false,
					"filterMap": {},
					"filterActive": false,
					"layers": [],
					"page": 1,
					"selection": [],
					"cfgs": [],
					"worldWindState": {
						"location": {
							"latitude": latidute,
							"longitude": longitude
						},
						"range": range
					},
					"mapsMetadata": [
						{
							"key": "default-map",
							"name": "Map 1",
							"wmsLayers": [
								ortofotoTemplateId
							],
							"layerPeriods": null,
							"placeGeometryChangeReview": {
								"showGeometryBefore": true,
								"showGeometryAfter": false
							}
						}
					],
					"mapDefaults": {
						"period": yearIds[0],
						"activeBackgroundLayerKey": "cartoDb",
						"navigator": {
							"lookAtLocation": {
								"latitude": latidute,
								"longitude": longitude
							},
							"range": range
						},
						"analyticalUnitsVisible": true
					}
				}
			};

		_.each(layerPeriods, (layerPeriod, index) => {
			baseDataview.conf.mapsMetadata.push({
				"key": `key_${index}`,
				"name": `Map ${index + 2}`,
				"wmsLayers": null,
				"layerPeriods": layerPeriod,
				"placeGeometryChangeReview": {
					"showGeometryBefore": true,
					"showGeometryAfter": false
				}
			});
		});

		return baseDataview;
	}

	static collectionName() {
		return 'lpischeck_case';
	}

	static groupName() {
		return 'lpischeck_cases';
	}

	static tableName() {
		return 'lpischeck_case';
	}
}

module.exports = PgLpisCheckCases;