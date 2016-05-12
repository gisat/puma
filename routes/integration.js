var config = require('../config.js');
var logger = require('../common/Logger').applicationWideLogger;

var Analysis = require('../integration/Analysis');
var GeonodeLayer = require('../integration/GeonodeLayer');
var GufMetadataStructures = require('../integration/GufMetadataStructures');
var RasterToVector = require('../integration/RasterToVector');
// Careful with renaming to uppercase start. Was created in windows with lowercase first.
var RemoteFile = require('../integration/remoteFile');
var ViewResolver = require('../integration/ViewResolver');
var conn = require('../common/conn');
var Process = require('../integration/Process');
var Processes = require('../integration/Processes');

module.exports = function (app) {
	// var runningProcesses = {};

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

		// runningProcesses[id] = {
		// 	tiff: urlOfGeoTiff,
		// 	status: "Started",
		// 	sourceUrl: urlOfGeoTiff
		// };
		var db = conn.getMongoDb();
		var processes = new Processes(db);
		var process = processes.store(new Process({
			tiff: urlOfGeoTiff,
			status: "Started",
			sourceUrl: urlOfGeoTiff
		}));

		//configuration
		var spatialAnalysisKey = 1;
		var levelAnalysisKey = 1;

		var promiseOfFile = remoteFile.get();
		promiseOfFile.then(function () {
			// runningProcesses[id].status = "Processing";
			// runningProcesses[id].message = "File was retrieved successfully and is being processed.";
			process.status("Processing", "File was retrieved successfully and is being processed.");
			processes.store(process);

			// Transform to vector
			return new RasterToVector("../scripts/", remoteFile.getDestination(), "") // todo result SHP file path as 3rd param
				.process();
		}).then(function(){
			// Upload to Geonode // Async
			return new GeonodeLayer()
				.upload();
		}).then(function(){
			// Connect metadata structures to layer // Async
			return new GufMetadataStructures()
				.create();
		}).then(function(){
			// Run analysis // Async
			return new Analysis(spatialAnalysisKey) // TODO Think of naming
				.run();
		}).then(function(){
			// Run level analysis // Async
			return new Analysis(levelAnalysisKey) // TODO Think of naming
				.run();
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
			// runningProcesses[id].status = "Finished";
			// runningProcesses[id].message = "File processing was finished.";
			// runningProcesses[id].url = url;
			process.end("File processing was finished.");
			process.setOption("url", url);
			processes.store(process);
		}).catch(function (err) {
			logger.error("/integration/process, for", request.body.url, ": File processing failed:", err);
			// runningProcesses[id].status = "Error";
			// runningProcesses[id].message = err;
			process.error(err);
			processes.store(process);
		});

		response.json({id: id});
	});

	app.get("/integration/status", function (request, response) {

		var url = require('url');
		var url_parts = url.parse(request.url, true);
		var query = url_parts.query;
		var processes = new Processes(conn.getMongoDb());

		var id = query.id;
		if (!id) {
			logger.error("Status integration request didn't contain id.");
			response.status(400).json({
				message: "Status integration request didn't contain id"
			});
			return;
		}

		var processPromise = processes.getById(id);
		processPromise.then(function(process){
			
		}); //////////////////////////////
		if (!runningProcesses[id]) {
			logger.error("There is no running process with id", id);
			response.status(400).json({
				message: "There is no running process with id " + id
			});
			return;
		}

		logger.info("/integration/status Requested status of task: ", id);

		if (runningProcesses[id].status == "Finished") {
			response.json({
				status: runningProcesses[id].status,
				url: runningProcesses[id].url,
				sourceUrl: runningProcesses[id].sourceUrl
			});
		} else {
			response.json({
				status: runningProcesses[id].status,
				sourceUrl: runningProcesses[id].sourceUrl,
				message: runningProcesses[id].message
			});
		}
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
