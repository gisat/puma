var fs = require('fs');
var request = require('request');

var RemoteFile = function () {

};

RemoteFile.prototype.validateUrl = function (url) {
	return true; // todo actually validate
};

RemoteFile.prototype.get = function (sourceUrl, destinationPath, callback) {

	var req = request.get(sourceUrl);

	req.on('response', function(response) {
		if (response.statusCode !== 200) {
			return callback(false,{error:'Response status '+ response.statusCode});
		}
	});

	req.on('error', function (err) {
		return callback(false,{error:'Request error: '+ err.message});
	});

	var file = fs.createWriteStream(destinationPath);
	request.pipe(file);

	file.on('finish', function() {
		file.close(callback(true));
	});

	file.on('error', function(err) {
		fs.unlink(destinationPath);
		return callback(false,{error:'File error: '+ err.message});
	});

};

module.exports = {
	RemoteFile: RemoteFile
};