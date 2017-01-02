var sass = require('node-sass');
var _ = require('underscore');

var config = require('../config');


// todo join with get-css.js and distinguish using some parameter
module.exports = function(req, res) {


	var scssVariables = {
		useWBHeader: config.toggles.useWBHeader,
		useHeader: config.toggles.useHeader,
		useWBAgreement: config.toggles.useWBAgreement,
		useWBFooter: config.toggles.useWBFooter,
		useFooterLegal: config.toggles.useFooterLegal,
		allowDownloadsLink: config.toggles.allowDownloadsLink,
		allowPumaHelp: config.toggles.allowPumaHelp,
		usePumaLogo: config.toggles.usePumaLogo
	};


	var scss = "";
	_.each(scssVariables, function(value, key){
		if(typeof value != "undefined") scss += "$" + key + ": " + value + ";\n";
	});
	scss += '@import "app-mng.scss";\n';


	// todo make this a function and maybe move this file (without the function) to /data or somewhere
	sass.render({
		data: scss,
		includePaths: ["css/"],
		outputStyle: config.environment=='development' ? 'expanded':'compressed'
	}, function (err, result) {
		if (err) {
			console.log("SASS Error: ", err);
			res.end("SASS Error: ", err);
		}
		res.end(result.css.toString());
	});

};