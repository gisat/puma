var config = require('../config.js');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');
let Promise = require('promise');
let superagent = require('superagent');

var RasterToPSQL = require('../integration/RasterToPSQL');
// Careful with renaming to uppercase start. Was created in windows with lowercase first.
var RemoteFile = require('../integration/remoteFile');
var ViewResolver = require('../integration/ViewResolver');

var Process = require('../integration/Process');
var Processes = require('../integration/Processes');
var FilterByIdProcesses = require('../integration/FilterByIdProcesses');

let PgWmsLayers = require('../layers/wms/PgWmsLayers');
let IntegrationScope = require('./IntegrationScope');
let PgPermissions = require('../security/PgPermissions');
let Permission = require('../security/Permission');
let MongoDataViews = require('../visualization/MongoDataViews');
let MongoLocation = require('../metadata/MongoLocation');
let MongoLocations = require('../metadata/MongoLocations');
let MongoScope = require('../metadata/MongoScope');
let MongoLayerReference = require('../layers/MongoLayerReference');
let MongoLayerReferences = require('../layers/MongoLayerReferences');

let PgLayerViews = require('../layers/PgLayerViews');
let PgBaseLayerTables = require('../layers/PgBaseLayerTables');
let GeoServerLayers = require('../layers/GeoServerLayers');
let GeonodeUpdateLayers = require('../layers/GeonodeUpdateLayers');
let RestLayer = require('../layers/RestLayer');
let User = require('../security/User');

let gdal = require('gdal');

class GufIntegrationController {
	constructor(app, pgPool, mongo, sourceSchema, targetSchema, dataSchema) {
		this._pgPool = pgPool;
		this._mongo = mongo;
		this._sourceSchema = sourceSchema;
		this._targetSchema = targetSchema;
		this._dataSchema = dataSchema;

		this._wmsLayers = new PgWmsLayers(pgPool, mongo, dataSchema);
		this._permissions = new PgPermissions(pgPool, dataSchema);
		this._locations = new MongoLocations(mongo);
		this._layerReferences = new MongoLayerReferences(mongo);
		this._dataViews = new MongoDataViews(mongo);

		this._layerViews = new PgLayerViews(pgPool, targetSchema, sourceSchema);
		this._baseLayerTables = new PgBaseLayerTables(pgPool);

		this._geoServerLayers = new GeoServerLayers(
			config.geoserverHost + config.geoserverPath,
			config.geoserverUsername,
			config.geoserverPassword
		);

		app.post("/integration/process", this.process.bind(this));
		app.get("/integration/status", this.status.bind(this));
	}

	process(request, response) {
		let user = request.session.user;
		if(user.id === User.guestId()) {
			logger.error("GufIntegrationController#process The user must be logged in. Guest doesn't have access.");
			response.status(400).json({
				message: "The user must be logged in. Guest doesn't have access"
			});
			return;
		}

		if (!request.body.url) {
			logger.error("Url of the data source must be specified.");
			response.status(400).json({
				message: "Url of the data source must be specified."
			});
			return;
		}

		logger.info("/integration/process, Start remote process. Url: ", request.body.url);

		var id = "a" + guid();
		var processes = new Processes(this._mongo);
		var process = new Process(id, {
			tiff: '',
			status: "Started",
			progress: 0,
			sourceUrl: request.body.url
		});
		processes.store(process);

		let administrativeUnitTable = `${this._sourceSchema}.au${id}`;
		let information, place, remoteFile, urlOfGeoTiff, defaultName;
		let rasterLayerTable, boundingBox, url, center;

		superagent.get(request.body.url)
			.set('Accept', 'application/json')
			.then(result => {
				defaultName = result.body.features[0].properties.title;
				urlOfGeoTiff = result.body.features[0].properties.EarthObservation.result.EarthObservationResult.product.ProductInformation.fileName.ServiceReference['@href'];
				logger.info(`GufIntegrationController#process DefaultName: ${defaultName} URL: ${urlOfGeoTiff}`);

				process.setOption('tiff', urlOfGeoTiff);
				processes.store(process);

				remoteFile = new RemoteFile(urlOfGeoTiff, id, config.temporaryDownloadedFilesLocation);
				if (!remoteFile.validateUrl()) {
					logger.error("Invalid file url provided, aborted.");
					response.status(400).json({
						message: "Invalid file url."
					});
					throw new Error('Invalid url');
				}

				return remoteFile.get();
		}).then(() => {
			process.status("Processing", "File was retrieved successfully and is being processed.", 13);
			processes.store(process);

			//  Integrate the received Tiff into the database
			return new RasterToPSQL(this._pgPool, remoteFile.getDestination())
				.process();
		}).then(rasterTableName => {
			rasterLayerTable = rasterTableName;
			process.status("Processing", logger.info("integration#process Raster has been imported to PostgreSQL and is being analyzed.", 26));
			processes.store(process);

			// Create table for the analytical units.
			return this.createAdministrativeUnit(remoteFile.getDestination(), administrativeUnitTable);
		}).then(pBoundingBox => {
			boundingBox = pBoundingBox.box;
			center = pBoundingBox.center;

			process.status("Processing", logger.info("integration#process Analysis.", 39));
			processes.store(process);

			// Add columns with the statistical information to the administrative unit table.
			// Also delete the information
			return this.analyse(rasterLayerTable, administrativeUnitTable);
		}).then(() => {
			process.status("Processing", logger.info("integration#process Retrieving information about scope or creating it.", 52));
			processes.store(process);

			// Create new Location with the right access rights only to current user
			return new IntegrationScope(this._mongo, this._pgPool, this._dataSchema, request.session.user, 'Global Urban Footprint', 2015).json();
		}).then((pInformation) => {
			information = pInformation;

			process.status("Processing", logger.info("integration#process Publishing layers in GeoServer and GeoNode.", 60));
			processes.store(process);

			// Create new publish layers.
			return this.publishLayer('au' + id);
		}).then(() => {
			process.status("Processing", logger.info("integration#process Create new location with permissions.", 65));
			processes.store(process);

			// Create new Location with the right access rights only to current user
			return this.createLocation(user, boundingBox, information.scope, defaultName);
		}).then((pPlace) => {
			place = pPlace;

			process.status("Processing", logger.info("integration#process Add Custom WMS.", 78));
			processes.store(process);

			return this.addCustomWms(user, information.scope, place, information.period);
		}).then(() => {
			process.status("Processing", logger.info("integration#process Creating references.", 91));
			processes.store(process);

			return this.createLayerRefs('au' + id, place, information.period, information.areaTemplate, information.attributeSet,
				information.attributes.urban, information.attributes.nonUrban);
		}).then(() => {
			process.status("Processing", logger.info("integration#process Creating data view.", 98));
			processes.store(process);

			return this.createDataView(information.scope, place, information.period, information.theme, information.areaTemplate, information.attributeSet, information.attributes.urban, information.attributes.nonUrban, center);
		}).then(function (url) {
			logger.info("integration#process Finished preparation of Url: ", url);
			// Set result to the process.
			process.end("File processing was finished.")
				.setOption("url", url);
			processes.store(process);
		}).catch(function (err) {
			logger.error("/integration/process, for", request.body.url, "(" + process.id + "): File processing failed:", err);
			process.error("Process failed.");
			processes.store(process);
		});

		response.json({id: id});
	}

	/**
	 * It retrieves the extent of the recevied GeoTiff and uses it as the analytical unit. It means create table of
	 * analytical units.
	 * @param rasterFile
	 * @param administrativeUnitsTable
	 */
	createAdministrativeUnit(rasterFile, administrativeUnitsTable) {
		// Get the polygon surrounding the raster.
		let dataset = gdal.open(rasterFile);
		let geoTransform = dataset.geoTransform;

		let numX = dataset.rasterSize.x;
		let numY = dataset.rasterSize.y;

		let minX = geoTransform[0];
		let minY = geoTransform[3] + (geoTransform[5] * numY);
		let maxX = geoTransform[0] + (geoTransform[1] * numX);
		let maxY = geoTransform[3];

		// For points for the Polygon
		let bbox = `POLYGON ((${minX} ${maxY},${maxX} ${maxY},${maxX} ${minY},${minX} ${minY},${minX} ${maxY}))`;

		let sql = `
			CREATE TABLE ${administrativeUnitsTable} (gid SERIAL, the_geom geometry, name text, urban double precision, non_urban double precision);
			INSERT INTO ${administrativeUnitsTable} (the_geom, name) VALUES (ST_GeomFromText('${bbox}', 4326), 'Area of interest');
		`;

		return this._pgPool.query(sql).then(() => {
			return {
				box: `${minX},${minY},${maxX},${maxY}`,
				center: {
					latitude: (minY + maxY / 2),
					longitude: (minX + maxX / 2)
				}
			};
		});
	}

	/**
	 * It counts the correct area of urban and non urban area.
	 * @param rasterTable {String} Name of the raster table containing the schema
	 * @param administrativeUnits {String} Name of the administrative units containing the schema
	 */
	analyse(rasterTable, administrativeUnits) {
		let sql = `
			UPDATE ${administrativeUnits}
SET urban = subquery.sum FROM (SELECT SUM(ST_Area(geography(ST_Envelope(rast))) * ST_ValueCount(rast, 255.0) /
                                            ST_Count(rast, FALSE)) / 1000000 as sum FROM ${rasterTable}) AS subquery;
			UPDATE ${administrativeUnits}
SET non_urban = subquery.sum FROM (SELECT SUM(ST_Area(geography(ST_Envelope(rast))) * ST_ValueCount(rast, 0.0) /
                                            ST_Count(rast, FALSE)) / 1000000 as sum FROM ${rasterTable}) AS subquery;
		`;

		return this._pgPool.query(sql);
	}

	/**
	 * It creates new location for given scope. It also adds relevant permissions.
	 * @param user
	 * @param boundingBox {String} Standard Bounding Box usable in the FO.
	 * @param scope {Number} Id of the scope this place belongs to.
	 * @param defaultName {String} Name to be used instead of Imported {Number}
	 * @returns {*|Promise.<TResult>}
	 */
	createLocation(user, boundingBox, scope, defaultName) {
		// Integrate into the relevant scope.
		let id = conn.getNextId();
		return this._locations.add({
			"_id": id,
			"active": true,
			"name": defaultName || "Imported " + id,
			"bbox": boundingBox,
			"dataset": scope
		}).then(() => {
			return Promise.all([
				this._permissions.add(user.id, MongoLocation.collectionName(), id, Permission.READ),
				this._permissions.add(user.id, MongoLocation.collectionName(), id, Permission.UPDATE),
				this._permissions.add(user.id, MongoLocation.collectionName(), id, Permission.DELETE)
			]);
		}).then(() => {
			return id;
		});
	}

	/**
	 * It simply make sure that the Custom WMS will be available for given layer.
	 * @param user
	 * @param scope {Number}
	 * @param place {Number}
	 * @param period {Number}
	 */
	addCustomWms(user, scope, place, period) {
		let layers;

		return this._wmsLayers.filtered(scope, null, null).then(pLayers => {
			layers = pLayers;

			if (layers.length === 0) {
				return this._wmsLayers.add({
					name: 'GUF2012-12M',
					url: 'https://utep.it4i.cz/geoserver/gwc/service/wms',
					scope: scope,
					places: [place],
					periods: [period],
					layer: 'ESA_UTEP:GUF04'
				}, user.id).then(layer => {
					return this._permissions.add(user.id, 'layer_wms', layer.id, Permission.READ);
				})
			} else {
				// Make sure that the user has permissions towards these layers.
				let promises = [];
				layers.forEach(layer => {
					if (!user.hasPermission('custom_wms', Permission.READ, layer.id)) {
						promises.push(this._permissions.add(user.id, 'layer_wms', layer.id, Permission.READ));
					}
				});
				return Promise.all(promises).then(() => {
					return Promise.all(layers.map(layer => {
						return this._wmsLayers.insertDependencies(layer.id, [place], null);
					}));
				});
			}
		});
	}

	/**
	 * It create relevant layer references.
	 * @param areaTemplateLayer {String} Name of the layer.
	 * @param place {Number} Id of the relevant place
	 * @param year {Number} Id of the relevant year
	 * @param areaTemplate {Number} Id of the relevant analytical units
	 * @param attributeSet {Number} Id of the relevant attribute set
	 * @param urbanAttribute {Number} Id of the Urban Attribute
	 * @param nonUrbanAttribute {Number} Id of the Non Urban Attribute
	 */
	createLayerRefs(areaTemplateLayer, place, year, areaTemplate, attributeSet, urbanAttribute, nonUrbanAttribute) {
		let baseLayerId = conn.getNextId();
		let dataLayerId = conn.getNextId();
		return this._layerReferences.add({
			"_id": baseLayerId,
			"layer": "geonode:" + areaTemplateLayer,
			"location": place,
			"year": year,
			"active": true,
			"areaTemplate": areaTemplate,
			"columnMap": [],
			"isData": false,
			"fidColumn": "gid",
			"nameColumn": "name",
			"parentColumn": null,
			"origin": "guf_integration"
		}).then(() => {
			return this._layerReferences.add({
				"_id": dataLayerId,
				"layer": "geonode:" + areaTemplateLayer,
				"location": place,
				"year": year,
				"active": true,
				"areaTemplate": areaTemplate,
				"columnMap": [
					{"attribute": urbanAttribute, "column": "urban"},
					{"attribute": nonUrbanAttribute, "column": "non_urban"}
				],
				"attributeSet": attributeSet,
				"isData": true,
				"fidColumn": "gid",
				"nameColumn": "name",
				"parentColumn": null,
				"origin": "guf_integration"
			});
		}).then(() => {
			return this._baseLayerTables.add(baseLayerId, 'gid', 'the_geom', areaTemplateLayer);
			// Recreate the views and base layers, which are necessary.
		}).then(() => {
			return this._layerViews.add(new MongoLayerReference(baseLayerId, this._mongo), [new MongoLayerReference(dataLayerId, this._mongo)]);
		}).then(() => {
			// TODO: parametrize workspace and datastore
			return this._geoServerLayers.create(new RestLayer('layer_' + baseLayerId, 'panther', 'views'));
		});
	}

	/**
	 *
	 * @param scope {Number}
	 * @param place {Number}
	 * @param period {Number}
	 * @param theme {Number}
	 * @param layerTemplate {Number}
	 * @param attributeSet {Number}
	 * @param urbanAttribute {Number}
	 * @param nonUrbanAtribute {Number}
	 */
	createDataView(scope, place, period, theme, layerTemplate, attributeSet, urbanAttribute, nonUrbanAtribute, center) {
		let dataViewId = conn.getNextId();
		return this._dataViews.add({
			"_id": dataViewId,
			"name": "",
			"conf": {
				"multipleMaps": false,
				"years": [
					period
				],
				"dataset": scope,
				"theme": theme,
				"visualization": null,
				"location": place,
				"expanded": {},
				"selMap": {
					"ff4c39": [
						{
							"at": layerTemplate,
							"gid": "1",
							"loc": place
						}
					]
				},
				"pagingUseSelected": false,
				"pagingSelectedColors": [
					"ff4c39",
					"34ea81",
					"39b0ff",
					"ffde58",
					"5c6d7e",
					"d97dff"
				],
				"filterMap": {},
				"filterActive": false,
				"layers": [
					{
						"opacity": 0.7,
						"sortIndex": 0,
						"type": "selectedareasfilled",
						"attributeSet": "",
						"attribute": "",
						"at": "",
						"name": "Selected areas filled",
						"symbologyId": ""
					},
					{
						"opacity": 0.7,
						"sortIndex": 1,
						"type": "areaoutlines",
						"attributeSet": "",
						"attribute": "",
						"at": "",
						"name": "Area outlines",
						"symbologyId": ""
					},
					{
						"opacity": 1,
						"sortIndex": 2,
						"type": "wmsLayer",
						"attributeSet": "",
						"attribute": "",
						"at": "",
						"name": "GUF2012-12M",
						"symbologyId": ""
					},
					{
						"opacity": 1,
						"sortIndex": 10000,
						"type": "terrain",
						"attributeSet": "",
						"attribute": "",
						"at": "",
						"name": "Google terrain",
						"symbologyId": ""
					}
				],
				"trafficLayer": false,
				"page": 1,
				"mapCfg": {
					"center": {
						"lon": center.latitude,
						"lat": center.longitude
					},
					"zoom": 7
				},
				"cfgs": [
					{
						"cfg": {
							"title": "Share of Urban / Non Urban",
							"type": "piechart",
							"attrs": [
								{
									"as": attributeSet,
									"attr": urbanAttribute,
									"normType": "area",
									"normAs": null,
									"normAttr": null,
									"normYear": "",
									"normalizationUnits": "%",
									"customFactor": "100",
									"attrNameNormalized": "",
									"checked": true,
									"numCategories": "",
									"classType": "",
									"displayUnits": "%",
									"areaUnits": "",
									"zeroesAsNull": "",
									"name": "",
									"topic": "",
									"parentId": null,
									"index": 0,
									"depth": 0,
									"expanded": false,
									"expandable": true,
									"leaf": false,
									"cls": "",
									"iconCls": "",
									"icon": "",
									"root": false,
									"isLast": false,
									"isFirst": false,
									"allowDrop": true,
									"allowDrag": true,
									"loaded": false,
									"loading": false,
									"href": "",
									"hrefTarget": "",
									"qtip": "",
									"qtitle": "",
									"children": null,
									"attrName": "Urban",
									"asName": "Global Urban Footprint",
									"units": "km2",
									"treeNodeText": "Urban"
								},
								{
									"as": attributeSet,
									"attr": nonUrbanAtribute,
									"normType": "area",
									"normAs": null,
									"normAttr": null,
									"normYear": "",
									"normalizationUnits": "%",
									"customFactor": "100",
									"attrNameNormalized": "",
									"checked": true,
									"numCategories": "",
									"classType": "",
									"displayUnits": "%",
									"areaUnits": "",
									"zeroesAsNull": "",
									"name": "",
									"topic": "",
									"parentId": null,
									"index": 0,
									"depth": 0,
									"expanded": false,
									"expandable": true,
									"leaf": false,
									"cls": "",
									"iconCls": "",
									"icon": "",
									"root": false,
									"isLast": false,
									"isFirst": false,
									"allowDrop": true,
									"allowDrag": true,
									"loaded": false,
									"loading": false,
									"href": "",
									"hrefTarget": "",
									"qtip": "",
									"qtitle": "",
									"children": null,
									"attrName": "Non Urban",
									"asName": "Global Urban Footprint",
									"units": "km2",
									"treeNodeText": "Non Urban"
								}
							],
							"units": "km2",
							"displayUnits": "%",
							"normalizationUnits": "%",
							"areaUnits": "",
							"featureLayerOpacity": "70",
							"classType": "quantiles",
							"numCategories": "5",
							"constrainFl": [
								0,
								0
							],
							"stacking": "none",
							"chartId": 8497275
						},
						"queryCfg": {
							"invisibleAttrs": [],
							"invisibleYears": []
						}
					},
					{
						"cfg": {
							"title": "Urban / Non Urban",
							"type": "columnchart",
							"attrs": [
								{
									"as": attributeSet,
									"attr": urbanAttribute,
									"normType": "area",
									"normAs": null,
									"normAttr": null,
									"normYear": "",
									"normalizationUnits": "%",
									"customFactor": "100",
									"attrNameNormalized": "",
									"checked": true,
									"numCategories": "",
									"classType": "",
									"displayUnits": "%",
									"areaUnits": "",
									"zeroesAsNull": "",
									"name": "",
									"topic": "",
									"parentId": null,
									"index": 0,
									"depth": 0,
									"expanded": false,
									"expandable": true,
									"leaf": false,
									"cls": "",
									"iconCls": "",
									"icon": "",
									"root": false,
									"isLast": false,
									"isFirst": false,
									"allowDrop": true,
									"allowDrag": true,
									"loaded": false,
									"loading": false,
									"href": "",
									"hrefTarget": "",
									"qtip": "",
									"qtitle": "",
									"children": null,
									"attrName": "Urban",
									"asName": "Global Urban Footprint",
									"units": "km2",
									"treeNodeText": "Urban"
								},
								{
									"as": attributeSet,
									"attr": nonUrbanAtribute,
									"normType": "area",
									"normAs": null,
									"normAttr": null,
									"normYear": "",
									"normalizationUnits": "%",
									"customFactor": "100",
									"attrNameNormalized": "",
									"checked": true,
									"numCategories": "",
									"classType": "",
									"displayUnits": "%",
									"areaUnits": "",
									"zeroesAsNull": "",
									"name": "",
									"topic": "",
									"parentId": null,
									"index": 0,
									"depth": 0,
									"expanded": false,
									"expandable": true,
									"leaf": false,
									"cls": "",
									"iconCls": "",
									"icon": "",
									"root": false,
									"isLast": false,
									"isFirst": false,
									"allowDrop": true,
									"allowDrag": true,
									"loaded": false,
									"loading": false,
									"href": "",
									"hrefTarget": "",
									"qtip": "",
									"qtitle": "",
									"children": null,
									"attrName": "Non Urban",
									"asName": "Global Urban Footprint",
									"units": "km2",
									"treeNodeText": "Non Urban"
								}
							],
							"units": "km2",
							"displayUnits": "%",
							"normalizationUnits": "%",
							"areaUnits": "",
							"featureLayerOpacity": "70",
							"classType": "quantiles",
							"numCategories": "5",
							"constrainFl": [
								0,
								0
							],
							"stacking": "percent",
							"chartId": 9211061
						},
						"queryCfg": {
							"invisibleAttrs": [],
							"invisibleYears": []
						}
					},
					{
						"cfg": {
							"title": "Urban / Non Urban",
							"type": "columnchart",
							"attrs": [
								{
									"as": attributeSet,
									"attr": urbanAttribute,
									"normType": "area",
									"normAs": null,
									"normAttr": null,
									"normYear": "",
									"normalizationUnits": "%",
									"customFactor": "100",
									"attrNameNormalized": "",
									"checked": true,
									"numCategories": "",
									"classType": "",
									"displayUnits": "%",
									"areaUnits": "",
									"zeroesAsNull": "",
									"name": "",
									"topic": "",
									"parentId": null,
									"index": 0,
									"depth": 0,
									"expanded": false,
									"expandable": true,
									"leaf": false,
									"cls": "",
									"iconCls": "",
									"icon": "",
									"root": false,
									"isLast": false,
									"isFirst": false,
									"allowDrop": true,
									"allowDrag": true,
									"loaded": false,
									"loading": false,
									"href": "",
									"hrefTarget": "",
									"qtip": "",
									"qtitle": "",
									"children": null,
									"attrName": "Urban",
									"asName": "Global Urban Footprint",
									"units": "km2",
									"treeNodeText": "Urban"
								},
								{
									"as": attributeSet,
									"attr": nonUrbanAtribute,
									"normType": "area",
									"normAs": null,
									"normAttr": null,
									"normYear": "",
									"normalizationUnits": "%",
									"customFactor": "100",
									"attrNameNormalized": "",
									"checked": true,
									"numCategories": "",
									"classType": "",
									"displayUnits": "%",
									"areaUnits": "",
									"zeroesAsNull": "",
									"name": "",
									"topic": "",
									"parentId": null,
									"index": 0,
									"depth": 0,
									"expanded": false,
									"expandable": true,
									"leaf": false,
									"cls": "",
									"iconCls": "",
									"icon": "",
									"root": false,
									"isLast": false,
									"isFirst": false,
									"allowDrop": true,
									"allowDrag": true,
									"loaded": false,
									"loading": false,
									"href": "",
									"hrefTarget": "",
									"qtip": "",
									"qtitle": "",
									"children": null,
									"attrName": "Non Urban",
									"asName": "Global Urban Footprint",
									"units": "km2",
									"treeNodeText": "Non Urban"
								}
							],
							"normalizationUnits": "%",
							"customFactor": "1",
							"areaUnits": "",
							"featureLayerOpacity": "70",
							"classType": "quantiles",
							"numCategories": "5",
							"constrainFl": [
								0,
								0
							],
							"stacking": "none",
							"chartId": 4322236
						},
						"queryCfg": {
							"invisibleAttrs": [],
							"invisibleYears": []
						}
					}
				]
			}
		}).then(() => {
			return `${config.remoteProtocol}://${config.remoteAddress}${config.projectHome}/tool/?id=${dataViewId}`;
		})
	}

	/**
	 *
	 * @param analyticalUnitsLayer
	 */
	publishLayer(analyticalUnitsLayer) {
		return this.getPublicWorkspaceSchema().then((publicWorkspaceSchema) => {
			return this._geoServerLayers.create(new RestLayer(analyticalUnitsLayer, publicWorkspaceSchema.workspace, config.geoServerDataStore));
		}).then(() => {
			let geonodeUpdateLayers = new GeonodeUpdateLayers();
			return geonodeUpdateLayers.filtered({layer: analyticalUnitsLayer});
		});
	}

	/**
	 * Return object with public workspace and schema based on config
	 */
	getPublicWorkspaceSchema() {
		return Promise.resolve().then(() => {
			let workspaceSchema = {};
			_.each(config.workspaceSchemaMap, (schema, workspace) => {
				if (schema === "public" && !workspaceSchema.schema && !workspaceSchema.workspace) {
					workspaceSchema.schema = schema;
					workspaceSchema.workspace = workspace;
				}
			});
			return workspaceSchema;
		});
	}

	status(request, response) {
		var url = require('url');
		var url_parts = url.parse(request.url, true);
		var query = url_parts.query;

		var id = query.id;
		if (!id) {
			logger.error("Status integration request didn't contain id.");
			response.status(400).json({
				message: "Status integration request didn't contain id"
			});
			return;
		}
		logger.info("/integration/status Requested status of task:", id);

		var oneProcesses = new FilterByIdProcesses(this._mongo, id);
		var allOneProcesses = oneProcesses.all();
		allOneProcesses.then(function (processes) {
			logger.info("FilterByIdProcesses all then: ", processes);

			if (!processes.length) {
				logger.error("There is no running process with id", id);
				response.status(400).json({
					success: false,
					message: "There is no running process with id " + id
				});
				resolve();
			}
			if (processes.length > 1) {
				logger.error("There is more then one process with id", id);
				response.status(500).json({
					message: "There is more then one process with id " + id
				});
				resolve();
			}
			var process = processes[0];

			var outputProcess = {
				id: process.id
			};

			_.extend(outputProcess, process.options);
			response.json(outputProcess);
			resolve();

		}).catch(function (err) {
			response.status(500).json({
				success: false,
				error: err
			});
		});
	}
}

function guid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}

	return s4() + s4() + '_' + s4() + '_' + s4() + '_' +
		s4() + '_' + s4() + s4() + s4();
}

module.exports = GufIntegrationController;