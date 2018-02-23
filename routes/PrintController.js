let logger = require('../common/Logger').applicationWideLogger;
let GeneratedImage = require('../visualization/GeneratedImage');
let fs = require('fs');
let UUID = require('../common/UUID');

class PrintController {
	constructor(app) {
		app.post('/print/download/:id', this.download.bind(this));
		app.get('/print/download/:id', this.download.bind(this));
		app.get('/print/snapshot/:id', this.snapshot.bind(this));

		app.post('/print/snapshot_url', this.snapshotUrl.bind(this));
	}

	snapshot(request, response, next) {
		let id = request.params.id;
		let image = new GeneratedImage(id);
		image.generate().then(function(image){
			response.set('Content-Type','image/png');
			response.set('Cache-Control','max-age=60000000');
			response.end(image, 'binary');
		});
	}

    snapshotUrl(request, response) {
		let url = request.body.url;
        let regex = /^data:.+\/(.+);base64,(.*)$/;

        let matches = url.match(regex);
        let ext = matches[1];
        let data = matches[2];
        let buffer = new Buffer(data, 'base64');

        let filePath = `/tmp/${new UUID().toString()}.${ext}`;
        fs.writeFileSync(filePath, buffer);

        response.download(filePath);
	}

	download(request, response, next) {
		let id = request.params.id;
		let image = new GeneratedImage(id);
		image.exists().then(exists => {
			if(!exists) {
				image.generate().then(() => {
					return image.path();
				}).then(function (path) {
					response.download(path);
				});
			} else {
				image.path().then(path=>{
					response.download(path);
				})
			}
		});
	}
}

module.exports = PrintController;