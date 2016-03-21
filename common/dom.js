var jsdom = require("jsdom");
var fs = require("fs");
var config = require('../config');

// Looks like this is not used, is it?
function execInDom(callback) {
	require('jsdom').env('http://' + config.localHost + ':' + config.localPort + config.localPath + '/index-for-dom.html', function(errors, window) {

		if (errors) {
			callback(errors);
		}
		GLOBAL.DOMParser = require('xmldom').DOMParser;
		GLOBAL.XMLSerializer = require('xmldom').XMLSerializer;
		//GLOBAL.document = require('xmldom').Document;
		for (var i in window) {
			if (i == "console") {
				continue;
			}
			eval("GLOBAL." + i + "=window['" + i + "'];");
		}
		return callback();
	})
}

module.exports = {
	execInDom: execInDom
};
