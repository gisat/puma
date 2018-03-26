var config = require('../config');
var path = require('path');
var Promise = require('promise');
var fs = require('pn/fs');

var logger = require('../common/Logger').applicationWideLogger;

class GeneratedImage {
	constructor(id, url) {
		this.url = url;
		this.id = id;
	}

	path() {
		let finalPath = path.resolve(config.snapshotDirectory + this.id + '.png');
		return Promise.resolve(finalPath);
	}

	generate() {
		logger.info('GeneratedImage#generate Started generation.');
        let body;
		return this.path().then((path) => {
            let regex = /^data:.+\/(.+);base64,(.*)$/;

            let matches = this.url.match(regex);
            let data = matches[2];
            body = new Buffer(data, 'base64');

            logger.info(`GeneratedImage#generate Path: ${path}`);
            return fs.writeFile(path, body);
		}).then(function(){
			return body;
		});
	}
}

module.exports = GeneratedImage;