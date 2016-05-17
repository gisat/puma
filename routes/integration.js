var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');

var SumRasterVectorGuf = require('../analysis/spatial/SumRasterVectorGuf');
var GeonodeLayer = require('../integration/GeonodeLayer');
var GufMetadataStructures = require('../integration/GufMetadataStructures');
var RasterToPSQL = require('../integration/RasterToPSQL');
// Careful with renaming to uppercase start. Was created in windows with lowercase first.
var RemoteFile = require('../integration/remoteFile');
var ViewResolver = require('../integration/ViewResolver');
var conn = require('../common/conn');
var Process = require('../integration/Process');
var Processes = require('../integration/Processes');
var FilterByIdProcesses = require('../integration/FilterByIdProcesses');

module.exports = function (app) {

	app.post("/integration/process", function (request, response) {
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

		var rasterTableName = null;
		var promiseOfFile = remoteFile.get();
		promiseOfFile.then(function () {
			process.status("Processing", "File was retrieved successfully and is being processed.");
			processes.store(process);
			// or like this:
			// processes.store(process.status("Processing", "..."));

			// Transform to vector
			return new RasterToPSQL(conn.getPgDataDb(), remoteFile.getDestination())
				.process();
		}).then(function(rasterLayerTableName){
			rasterTableName = rasterLayerTableName;
			// Connect metadata structures to layer // Async
			return new GufMetadataStructures()
				.create();
		}).then(function(){
			// Run analysis // Async
			var rasterLayerTableName = "public." + rasterTableName;
			var promises = [];
			promises.push(new SumRasterVectorGuf("views.layer_6353", rasterLayerTableName, 6353)
				.run());
			promises.push(new SumRasterVectorGuf("views.layer_6354", rasterLayerTableName, 6354)
				.run());
			promises.push(new SumRasterVectorGuf("views.layer_6355", rasterLayerTableName, 6355)
				.run());
			promises.push(new SumRasterVectorGuf("views.layer_6356", rasterLayerTableName, 6356)
				.run());

			return Promise.all(promises);
		}).then(function(){
			// In Puma specify FrontOffice view
			var viewProps = {
				location: "2450_39", //placeKey + "_" + areaKey, // place + area (NUTS0)
				expanded: {
					2450: {
						1426: [
							39
						] // au level
					} // place
				},
				mapCfg: {
					center: {
						lon: 11793025.757714,
						lat: 1228333.4862894
					},
					zoom: 7
				}
			};
			return new ViewResolver(viewProps) // TODO Think of naming
				.create();
		}).then(function(url){
			// Set result to the process.
			process.end("File processing was finished.")
				.setOption("url", url);
			processes.store(process);
		}).catch(function (err) {
			logger.error("/integration/process, for", request.body.url, ": File processing failed:", err);
			process.error(err);
			processes.store(process);
		});

		response.json({id: id});
	});


	app.get("/integration/status", function (request, response) {

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
		console.log("oneProcesses", oneProcesses);
		console.log("allOneProcesses", allOneProcesses);
		allOneProcesses.then(function(processes){
			console.log("FilterByIdProcesses all then: ", processes);

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

			response.json(process);
			resolve();

		}).catch(function(err){
			response.status(500).json({
				success: false,
				error: err
			});
		});

	});

	function guid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000)
				.toString(16)
				.substring(1);
		}

		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
			s4() + '-' + s4() + s4() + s4();
	}
};
