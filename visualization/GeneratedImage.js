const config = require('../config');
const path = require('path');
const Promise = require('promise');
const fs = require('pn/fs');

const logger = require('../common/Logger').applicationWideLogger;

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