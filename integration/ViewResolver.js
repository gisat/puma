var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;

/**
 * Created by jbalhar on 6. 5. 2016.
 */
var ViewResolver = function(){
	
};

ViewResolver.prototype.create = function(){
	return new Promise(function(resolve, reject){
		resolve("http://185.8.164.70/tool/?id=6290");
	});
};

module.exports = ViewResolver;