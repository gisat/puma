module.exports = function(label){
	var timer = label + "-" + Math.round(Math.random()*10000);
	console.log(timer + " START TIMER");
	console.time(timer);
	return function(){
		console.timeEnd(timer);
	};
};
