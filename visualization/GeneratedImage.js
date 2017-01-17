var config = require('../config');
var path = require('path');
var Promise = require('promise');
var child_process  = require('pn/child_process');
var fs = require('pn/fs');

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
		var pathOfResult;
		return this.path().then(function(path){
			pathOfResult = path;
			logger.info('GeneratedImage#generate Start process. Url: ', self.url, ' Path: ', path);
			return child_process.execFile(self.phantomName, ['--ssl-protocol=any --ignore-ssl-errors=yes --debug=true', 'visualization/PhantomJsPrint.js', self.url, path, '-', 1], {}).promise;
		}).then(function(result){
			logger.info("stderr:  ", result.stderr);
			logger.info("stdout:\n", result.stdout);
			return fs.readFile(pathOfResult);
		});
	}
}

module.exports = GeneratedImage;