var logger = require('./Logger').applicationWideLogger;

module.exports = function(label){
	var timer = label + "-" + Math.round(Math.random()*10000);
	logger.info("timer#default ", timer, " START TIMER");
	console.time(timer);
	return function(){
		console.timeEnd(timer);
	};
};
