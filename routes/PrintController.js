const logger = require('../common/Logger').applicationWideLogger;
const GeneratedImage = require('../visualization/GeneratedImage');
const fs = require('fs');

class PrintController {
	constructor(app) {
        app.post('/print/snapshot/:id', this.snapshot.bind(this));
        app.delete('/print/snapshot/:id', this.delete.bind(this))

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

	delete(request, response) {
        logger.info(`PrintController#delete Id: ${request.params.id}`);
        let id = request.params.id;
        let image = new GeneratedImage(id);
        image.path().then(path=>{
        	fs.unlink(path, (err) => {
        		if(err) {
        			logger.error(`PrintController#delete Id: ${id} Error: `, err);
        			response.json({
						"success": "error",
						"message": err
					})
				}
                response.json({
                    "success": "ok"
                });
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