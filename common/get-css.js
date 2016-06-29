var sass = require('node-sass');
var _ = require('underscore');

var config = require('../config');


module.exports = function(req, res) {


	// config variables passed to Sass compiler
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


	// base Sass code
	var scss = "";
	_.each(scssVariables, function(value, key){
		if(typeof value != "undefined") scss += "$" + key + ": " + value + ";\n";
	});
	scss += '@import "app.scss";\n';
	
	
	// import project-specific styles
	if(config.toggles.isUrbis){
		scss += '@import "urbis";\n'; // this imports _urbis.scss
	}
	
	

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