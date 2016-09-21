var page = require('webpage').create(),
	system = require('system');

var requested = 0;
var received = 0;
// Use the requests and received resources to track whether everything was already downloaded.
page.onResourceRequested = function(request) {
	requested++;
	console.log('Requested ' + requested);
};
page.onResourceReceived = function(response) {
	received++;
	console.log('Received ' + requested);
};

var address = system.args[1];
var finalLocation = system.args[2];
page.viewportSize = { width: 1600, height: 1200 };
page.open(address, function(status) {
	console.log("Status", status);
	setTimeout(verifyAllLoaded, 2000);
});

function verifyAllLoaded() {
	if(requested!=received) {
		setTimeout(verifyAllLoaded, 1000);
	} else {
		console.log("Rendering");
		page.render(finalLocation);
		phantom.exit();
	}
}