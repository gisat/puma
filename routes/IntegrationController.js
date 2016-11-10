var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');
var _ = require('underscore');

var GeonodeLayer = require('../integration/GeonodeLayer');
var ImportedPlace = require('../integration/ImportedPlace');
var RasterToPSQL = require('../integration/RasterToPSQL');
var RunSQL = require('../integration/RunSQL');
// Careful with renaming to uppercase start. Was created in windows with lowercase first.
var RemoteFile = require('../integration/remoteFile');
var ViewResolver = require('../integration/ViewResolver');
var conn = require('../common/conn');
var Process = require('../integration/Process');
var Processes = require('../integration/Processes');
var FilterByIdProcesses = require('../integration/FilterByIdProcesses');
var CenterOfRaster = require('../analysis/spatial/CenterOfRaster');
var Location = require('../integration/Location');

class IntegrationController {
	constructor(app, pgPool) {
		this._pgPool = pgPool;

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
		var id = guid();

		var remoteFile = new RemoteFile(urlOfGeoTiff, id, config.temporaryDownloadedFilesLocation);
		if (!remoteFile.validateUrl()) {
			logger.error("Invalid file url provided, aborted.");
			response.status(400).json({
				message: "Invalid file url."
			});
			return;
		}

		var db = conn.getMongoDb();
		var processes = new Processes(db);
		var process = new Process(id, {
			tiff: urlOfGeoTiff,
			status: "Started",
			sourceUrl: urlOfGeoTiff
		});
		processes.store(process);

		var promiseOfFile = remoteFile.get();
		var rasterLayerTable, center, layerRefId;
		promiseOfFile.then(function () {
			process.status("Processing", "File was retrieved successfully and is being processed.");
			processes.store(process);

			return new RasterToPSQL(conn.getPgDataDb(), remoteFile.getDestination())
				.process();
		}).then(function(sqlOptions){
			process.status("Processing", "Raster has been converted to SQL and is being imported.");
			processes.store(process);
			return new RunSQL(conn.getPgDataDb(), sqlOptions)
				.process();
		}).then(function(rasterTableName) {
			process.status("Processing", logger.info("integration#process Raster has been imported to PostgreSQL and is being analyzed."));
			processes.store(process);

			rasterLayerTable = rasterTableName; // At this point we can find out about relevant area.
			return new ImportedPlace(conn.getPgDataDb(), rasterTableName)
				.create();
		}).then(function(pLayerRefId){
			layerRefId = pLayerRefId;
			return new CenterOfRaster(rasterLayerTable).center();
		}).then(function(pCenter){
			center = pCenter;
			return new Location(center, layerRefId).location();
		}).then(function(locationId){
			logger.info("integration#process Analysis was finished and view is being prepared.");
			// In Puma specify FrontOffice view. TODO: Fix for dynamic levels.
			var viewProps = {
				location: "6294_" + locationId, //placeKey + "_" + areaKey, // place + area (NUTS0)
				expanded: {
					6294: {
						6292: [
							locationId // todo cast to string?
						] // au level
					} // place
				},
				mapCfg: {
					center: {
						lon: center.x,
						lat: center.y
					},
					zoom: 6
				}
			};
			return new ViewResolver(viewProps) // TODO Think of naming
				.create();
		}).then(function(url){
			logger.info("Finished preparation of Url: ", url);
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

		var oneProcesses = new FilterByIdProcesses(conn.getMongoDb(), id);
		var allOneProcesses = oneProcesses.all();
		allOneProcesses.then(function(processes){
			logger.info("FilterByIdProcesses all then: ", processes);

			if (!processes.length) {
				logger.error("There is no running process with id", id);
				response.status(400).json({
					success: false,
					message: "There is no running process with id " + id
				});
				resolve();
			}
			if(processes.length > 1){
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

		}).catch(function(err){
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

module.exports = IntegrationController;