const logger = require('../common/Logger').applicationWideLogger;
const GeneratedImage = require('../visualization/GeneratedImage');
const fs = require('fs');

class PrintController {
	constructor(app) {
        app.post('/print/snapshot/:id', this.snapshot.bind(this));

		app.get('/print/download/:id', this.download.bind(this));
        app.get('/print/display/:id', this.download.bind(this));
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

	display(request, response) {
        logger.info(`PrintController#display Id: ${request.params.id}`);
        let id = request.params.id;
        let image = new GeneratedImage(id, request.body.url);
        image.path().then(path => {
            response.set('Content-Type','image/png');
            response.set('Cache-Control','max-age=60000000');

            const src = fs.createReadStream(path);
            src.pipe(response);
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