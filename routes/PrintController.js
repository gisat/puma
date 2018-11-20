let logger = require('../common/Logger').applicationWideLogger;
let GeneratedImage = require('../visualization/GeneratedImage');

class PrintController {
	constructor(app) {
        app.post('/print/snapshot/:id', this.snapshot.bind(this));

		app.get('/print/download/:id', this.download.bind(this));
	}

	snapshot(request, response) {
		logger.info(`PrintController#snapshot Id: ${request.params.id}`);
		let id = request.params.id;
		let image = new GeneratedImage(id, request.body.url);
		image.generate().then(function(){
			response.json({
				"id": id,
				"success": "ok"
			});
		});
	}

	download(request, response) {
        logger.info(`PrintController#download Id: ${request.params.id}`);
        let id = request.params.id;
		let image = new GeneratedImage(id);
        image.path().then(path=>{
            response.download(path);
        });
	}
}

module.exports = PrintController;