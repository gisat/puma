var sass = require('node-sass');
var _ = require('underscore');

var config = require('../config');


module.exports = function(req, res) {


	var scssVariables = {
		useWBHeader: config.toggles.useWBHeader,
		useWBAgreement: config.toggles.useWBAgreement,
		useWBFooter: config.toggles.useWBFooter,
		allowDownloadsLink: config.toggles.allowDownloadsLink,
		allowPumaHelp: config.toggles.allowPumaHelp,
		usePumaLogo: config.toggles.usePumaLogo
	};


	var scss = "";
	_.each(scssVariables, function(value, key){
		if(typeof value != "undefined") scss += "$" + key + ": " + value + ";\n";
	});
	scss += '@import "app.scss";\n';


	sass.render({
		data: scss,
		includePaths: ["scss/"],
		outputStyle: config.environment=='development' ? 'expanded':'compressed'
	}, function (err, result) {
		if (err) {
			console.log("SASS Error: ", err);
			res.end("SASS Error: ", err);
		}
		res.set('Content-Type', 'text/css');
		res.end(result.css.toString());
	});

};