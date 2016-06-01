var config = require('../config');

module.exports = function(request, response, next){
	var Config = {
		url: config.remoteProtocol + '://' + config.remoteAddress,
		signupAddress: config.geonodeProtocol + '://' + config.geonodeHost + config.geonodePath + '/account/signup/',
		geoserver2Workspace: config.geoserver2Workspace,
		initialBaseMap: config.initialBaseMap,
		toggles: config.toggles
	};
	response.end('var Config = ' + JSON.stringify(Config));

};

