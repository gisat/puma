var page = require('webpage').create(),
	system = require('system');

var requested = 0;
var received = 0;
var lastReceived = Date.now();
// Use the requests and received resources to track whether everything was already downloaded.
page.onResourceRequested = function(request) {
	requested++;
};
page.onResourceReceived = function(response) {
	lastReceived = Date.now();
	received++;
};

var address = system.args[1];
var finalLocation = system.args[2];
page.viewportSize = { width: 600, height: 400 };
page.open(address, function(status) {
	console.log("Status", status);
	setTimeout(verifyAllLoaded, 2000);
});

function verifyAllLoaded() {
	console.log('VerifyAllLoaded Last: ', lastReceived, ' Received: ', received, 'Requested: ', requested);
	// Both must be satisfied
	if(requested <= received && olderThanThreshold(lastReceived)) {
		console.log("Rendering");
		page.render(finalLocation);
		phantom.exit();
	} else {
		setTimeout(verifyAllLoaded, 1000);
	}
}

function olderThanThreshold(lastReceived) {
	return Date.now() - 1000 > lastReceived;
}