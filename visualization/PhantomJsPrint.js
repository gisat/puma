var page = require('webpage').create(),
	system = require('system');

// Use the requests and received resources to track whether everything was already downloaded.
page.onResourceRequested = function(request) {
	console.log('Request ' + JSON.stringify(request, undefined, 4));
};
var lastResourceReceived = Date.now();
page.onResourceReceived = function(response) {
	lastResourceReceived = Date.now();
	console.log('Receive ' + JSON.stringify(response, undefined, 4));
};

var address = system.args[1];
var finalLocation = system.args[2];
page.viewportSize = { width: 1600, height: 1200 };
page.open(address, function(status) {
	setTimeout(function(){
		console.log(lastResourceReceived);
		if(Date.now() - 10000 > lastResourceReceived) {
			console.log("Everything was loaded.");
		}
		page.render(finalLocation);
		phantom.exit();
	}, 60000);
});