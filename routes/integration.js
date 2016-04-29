var logger = require('../common/Logger').applicationWideLogger;

module.exports = function(app) {
	var runningProcesses = {

	};

	logger.info("Set up the route: /integration/process, method: POST");
	app.post("/integration/process", function(request, response){
		if(!request.body.url){
			logger.error("Url of the data source must be specified.");
			response.status(400).json({
				message: "Url of the data source must be specified."
			});
			return;
		}

		var urlOfGeoTiff = request.body.url;
		var id = guid();

		runningProcesses[id] = {
			tiff: urlOfGeoTiff,
			status: "Started",
			sourceUrl: urlOfGeoTiff
		};

		setTimeout(function(){ // After 30 seconds change to finished
			runningProcesses[id].status = "Finished";
			runningProcesses[id].url = "http://185.8.164.70/tool/?id=6290";

		}, 30000);

		response.json({id: id});
	});

	logger.info("Set up the route: /integration/status, method: GET");
	app.get("/integration/status", function(request, response){

		var url = require('url');
		var url_parts = url.parse(request.url, true);
		var query = url_parts.query;

		var id = query.id;
		if(!id) {
			logger.error("Status integration request didn't contain id.");
			response.status(400).json({
				message: "Status integration request didn't contain id"
			});
			return;
		}

		if(!runningProcesses[id]) {
			logger.error("There is no running process with id", id);
			response.status(400).json({
				message: "There is no running process with id " + id
			});
			return;
		}

		if(runningProcesses[id].status == "Finished") {
			response.json({
				status: runningProcesses[id].status,
				url: runningProcesses[id].url,
				sourceUrl: runningProcesses[id].sourceUrl
			});
		} else {
			response.json({
				status: runningProcesses[id].status,
				sourceUrl: runningProcesses[id].sourceUrl
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
