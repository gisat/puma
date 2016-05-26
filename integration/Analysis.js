var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * Created by jbalhar on 6. 5. 2016.
 */
var Analysis = function(){

};

Analysis.prototype.run = function() {
	return new Promise(function(resolve, reject){
		resolve();
	});
};

module.exports = Analysis;