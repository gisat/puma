var fs = require('fs');
var request = require('request');
var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

var RemoteFile = function (url, id, temporaryDownloadedFilesLocation) {
	this.url = url;
	this.id = id;
	this.temporaryDownloadedFilesLocation = temporaryDownloadedFilesLocation;
};

RemoteFile.prototype.getDestination = function() {
	var filePartsDiscriminatedByDot = this.url.split('.');
	var fileType = filePartsDiscriminatedByDot[filePartsDiscriminatedByDot.length - 1];

	// TODO replace with template. "{Directory}{fileName}.{extension}", , ,
	return this.temporaryDownloadedFilesLocation + this.id + "." + fileType;
};

RemoteFile.prototype.validateUrl = function () {
	return true; // todo actually validate
};

RemoteFile.prototype.get = function () {
	logger.trace("RemoteFile#get Get remote file");
	var sourceUrl = this.url;

	var self = this;
	return new Promise(function(resolve, reject){
		var req = request.get(sourceUrl);

		req.on('response', function(response) {
			if (response.statusCode !== 200) {
				logger.error("RemoteFile#get Response status: ", response.statusCode);
				reject('Response status '+ response.statusCode);
			}
		});

		req.on('error', function (err) {
			logger.error("RemoteFile#get Request error: ", err);
			reject('Request error: '+ err);
		});

		var destinationPath = self.getDestination();
		var file = fs.createWriteStream(destinationPath);
		req.pipe(file);

		file.on('finish', function() {
			file.close(function(err){
				if(err){
					logger.error("RemoteFile#get File close error: ", err);
				}
				resolve();
			});
		});

		file.on('error', function(err) {
			fs.unlink(destinationPath);
			logger.error("RemoteFile#get File error: ", err);
			reject('File error: '+ err);
		});
	});
};

module.exports = RemoteFile;