var config = require('../config');
var path = require('path');
var Promise = require('promise');
var child_process  = require('pn/child_process');
var fs = require('pn/fs');
var superagent = require('superagent');

var logger = require('../common/Logger').applicationWideLogger;

class GeneratedImage {
	constructor(id) {
		// TODO: Find meaningful solution to the path.
		this.url = config.remoteProtocol + "://" + config.remoteAddress + "/tool/index.html?id=" + id + "&print";
		this.id = id;

		var isWin = !!process.platform.match(/^win/);
		this.phantomName = isWin ? 'phantomjs.exe'  : 'phantomjs';
	}

	path() {
		let finalPath = path.resolve(config.snapshotDirectory + this.id + '.png');
		return Promise.resolve(finalPath);
	}

	exists() {
		return this.path().then(path => {
			return fs.exists(path);
		})
	}

	generate() {
		logger.info('GeneratedImage#generate Started generation.');
		var self = this;
		var pathOfResult, body;
		return this.path().then(function(path){
			// Load the image from the API and then save it to the internal path.
			// http://api.screenshotmachine.com/?key=a647a7&dimension=1024x768&format=png&timeout=1000&url=https%3A%2F%2Fpuma.worldbank.org%2Ftool%2Findex.html%3Fid%3D29717%26print

			pathOfResult = path;
			logger.info('GeneratedImage#generate Start process. Url: ', self.url, ' Path: ', path);
			return superagent.get(`http://api.screenshotmachine.com/?key=a647a7&dimension=1024x768&format=png&timeout=1000&url=https%3A%2F%2Fpuma.worldbank.org%2Ftool%2Findex.html%3Fid%3D${self.id}%26print`);
		}).then(function(result){
			body = result.body;
			return fs.writeFile(pathOfResult, body);
		}).then(() => {
			return body;
		});
	}
}

module.exports = GeneratedImage;