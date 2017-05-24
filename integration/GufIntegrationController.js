var config = require('../config.js');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;
var _ = require('underscore');
let Promise = require('promise');

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
let MongoLocations = require('../metadata/MongoLocations');
let MongoScope = require('../metadata/MongoScope');
let MongoLayerReference = require('../layers/MongoLayerReference');
let MongoLayerReferences = require('../layers/MongoLayerReferences');

let PgLayerViews = require('../layers/PgLayerViews');
let PgBaseLayerTables = require('../layers/PgBaseLayerTables');

let fs = require('fs');
let geotiff = require('geotiff');
let epsg = require('epsg-to-proj');
let extents = require('geotiff-extents');

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

		this._layerViews = new PgLayerViews(pgPool, targetSchema, sourceSchema);
		this._baseLayerTables = new PgBaseLayerTables(pgPool);

		app.post("/integration/process", this.process.bind(this));
		app.get("/integration/status", this.status.bind(this));
	}

	process(request, response) {
		if (!request.body.url) {
			logger.error("Url of the data source must be specified.");
			response.status(400).json({
				message: "Url of the data source must be specified."
			});
			return;
		}

		logger.info("/integration/process, Start remote process. Url: ", request.body.url);

		var urlOfGeoTiff = request.body.url;
		var id = "a" + guid();

		var remoteFile = new RemoteFile(urlOfGeoTiff, id, config.temporaryDownloadedFilesLocation);
		if (!remoteFile.validateUrl()) {
			logger.error("Invalid file url provided, aborted.");
			response.status(400).json({
				message: "Invalid file url."
			});
			return;
		}

		var db = this._mongo;
		var processes = new Processes(db);
		var process = new Process(id, {
			tiff: urlOfGeoTiff,
			status: "Started",
			progress: 0,
			sourceUrl: urlOfGeoTiff
		});
		processes.store(process);

		let administrativeUnitTable = `${this._sourceSchema}.au${id}`;
		let information, place;
		let user = request.session.user;
		var rasterLayerTable, boundingBox, url;
		remoteFile.get().then(() => {
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
			boundingBox = pBoundingBox;

			process.status("Processing", logger.info("integration#process Analysis.", 39));
			processes.store(process);

			// Add columns with the statistical information to the administrative unit table.
			// Also delete the information
			return this.analyse(administrativeUnitTable, rasterLayerTable);
		}).then(() => {
			process.status("Processing", logger.info("integration#process Retrieving information about scope or creating it.", 52));
			processes.store(process);

			// Create new Location with the right access rights only to current user
			return new IntegrationScope(this._mongo, this._pgPool, this._dataSchema, 'Global Urban Footprint', 2015).json();
		}).then((pInformation) => {
			information = pInformation;

			process.status("Processing", logger.info("integration#process Create new location with permissions.", 65));
			processes.store(process);

			// Create new Location with the right access rights only to current user
			return this.createLocation(user, boundingBox, information.scope);
		}).then((pPlace) => {
			place = pPlace;

			process.status("Processing", logger.info("integration#process Add Custom WMS.", 78));
			processes.store(process);

			return this.addCustomWms(user, information.scope, place);
		}).then(() => {
			process.status("Processing", logger.info("integration#process Creating references.", 91));
			processes.store(process);

			return this.createLayerRefs(id, place, information.year, information.areaTemplate, information.attributeSet,
				information.attributes.urban, information.attributes.nonUrban);
		}).then(() => {
			process.status("Processing", logger.info("integration#process Creating data view.", 98));
			processes.store(process);

			return this.createDataView(place, information.year, information.areaTemplate, information.attributeSet,
				information.attributes.urban, information.attributes.nonUrban);
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
		var data = this.toArrayBuffer(fs.readFileSync(rasterFile));
		var im = geotiff.parse(data).getImage();
		var fd = im.getFileDirectory();
		var gk = im.getGeoKeys();

		var extent = extents({
			tiePoint: fd.ModelTiepoint,
			pixelScale: fd.ModelPixelScale,
			width: fd.ImageWidth,
			height: fd.ImageLength,
			proj: require('proj4'),
			from: epsg[gk.ProjectedCSTypeGeoKey || gk.GeographicTypeGeoKey],
			to: epsg[4326]
		});
		// For points for the Polygon
		let bbox = `POLYGON ((${extent.upperLeft[0]} ${extent.upperLeft[1]},${extent.upperRight[0]} ${extent.upperRight[1]},${extent.lowerRight[0]} ${extent.lowerRight[1]},${extent.lowerLeft[0]} ${extent.lowerLeft[1]},${extent.upperLeft[0]} ${extent.upperLeft[1]}))`;

		let sql = `
			CREATE TABLE ${administrativeUnitsTable} (gid SERIAL, the_geom geometry, name text, urban double precision, non_urban double precision);
			INSERT INTO ${administrativeUnitsTable} (the_geom, name) VALUES (ST_GeomFromText('${bbox}', 4326), 'area');
		`;

		return this._pgPool.query(sql).then(() => {
			return `${extent.upperLeft[0]},${extent.lowerRight[1]},${extent.lowerRight[0]},${extent.upperLeft[1]}`;
		});
	}

	toArrayBuffer(buffer) {
		var ab = new ArrayBuffer(buffer.length);
		var view = new Uint8Array(ab);
		for (var i = 0; i < buffer.length; ++i) {
			view[i] = buffer[i];
		}
		return ab;
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
	 * @param boundingBox {String} Standard Bounding Box usable in the FO.
	 * @param scope {Number} Id of the scope this place belongs to.
	 * @returns {*|Promise.<TResult>}
	 */
	createLocation(user, boundingBox, scope) {
		// Integrate into the relevant scope.
		let id = conn.getNextId();
		return this._locations.add({
			"_id": id,
			"active": true,
			"name": "Imported " + id,
			"bbox": boundingBox,
			"dataset": scope
		}).then(() => {
			return Promise.all([
				this._permissions.add(user.id, MongoScope.collectionName(), id, Permission.READ),
				this._permissions.add(user.id, MongoScope.collectionName(), id, Permission.UPDATE),
				this._permissions.add(user.id, MongoScope.collectionName(), id, Permission.DELETE)
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
	 */
	addCustomWms(user, scope, place) {
		// Load layers in the scope.
		let layers;
		this._wmsLayers.filtered(scope, null, null).then(pLayers => {
			layers = pLayers;
			// Make sure that the user has permissions towards these layers.
			let promises = [];
			layers.forEach(layer => {
				if(!user.hasPermission('custom_wms', Permission.READ, layer.id)){
					promises.push(this._permissions.add(user.id, 'custom_wms', layer.id, Permission.READ));
				}
			});
			return Promise.all(promises);
		}).then(() => {
			return Promise.all(layers.map(layer => {
				return this._wmsLayers.insertDependencies(layer.id, [place], null);
			}));
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
		});
	}

	createDataView() {
		// TODO: create correct data view.
		return null;
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