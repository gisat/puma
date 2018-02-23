let logger = require('../common/Logger').applicationWideLogger;
let GeneratedImage = require('../visualization/GeneratedImage');

class PrintController {
	constructor(app) {
		app.post('/print/download/:id', this.download.bind(this));
		app.get('/print/download/:id', this.download.bind(this));
		app.get('/print/snapshot/:id', this.snapshot.bind(this));
	}

	snapshot(request, response) {
		logger.info(`PrintController#snapshot Id: ${request.params.id}`);
		let id = request.params.id;
		let image = new GeneratedImage(id, request.body.url);
		image.generate().then(function(image){
			response.set('Content-Type','image/png');
			response.set('Cache-Control','max-age=60000000');
			response.end(image, 'binary');
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