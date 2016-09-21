var page = require('webpage').create(),
	system = require('system');

var requested = 0;
// Use the requests and received resources to track whether everything was already downloaded.
page.onResourceRequested = function(request) {
	requested++;
	console.log('Request ' + JSON.stringify(request, undefined, 4));
};
var lastResourceReceived = Date.now();
page.onResourceReceived = function(response) {
	requested--;
	lastResourceReceived = Date.now();
	console.log('Receive ' + JSON.stringify(response, undefined, 4));
};

var address = system.args[1];
var finalLocation = system.args[2];
page.viewportSize = { width: 1600, height: 1200 };
page.open(address, function(status) {
	console.log("Status", status);
	setTimeout(verifyAllLoaded, 2000);
});

function verifyAllLoaded() {
	if(requested!=0) {
		setTimeout(verifyAllLoaded, 1000);
	} else {
		page.render(finalLocation);
		phantom.exit();
	}
}