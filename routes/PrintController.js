var logger = require('../common/Logger').applicationWideLogger;
var GeneratedImage = require('../visualization/GeneratedImage');

class PrintController {
	constructor(app) {
		app.post('/print/download/:id', this.download.bind(this));
		app.get('/print/download/:id', this.download.bind(this));
		app.get('/print/snapshot/:id', this.snapshot.bind(this));
	}

	snapshot(request, response, next) {
		var id = request.params.id;
		var image = new GeneratedImage(id);
		image.generate().then(function(image){
			response.set('Content-Type','image/png');
			response.set('Cache-Control','max-age=60000000');
			response.end(image, 'binary');
		});
	}

	download(request, response, next) {
		var id = request.params.id;
		var image = new GeneratedImage(id);
		image.path().then(function(path){
			response.download(path);
		});
	}
}

module.exports = PrintController;