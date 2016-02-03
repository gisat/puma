var page = require('webpage').create(),
		system = require('system'),
		address, output, size;

// wrong arguments
if (system.args.length < 3 || system.args.length > 5) {
	console.log('Usage: rasterize.js URL filename [paperwidth*paperheight|paperformat] [zoom]');
	console.log('  paper (pdf output) examples: "5in*7.5in", "10cm*20cm", "A4", "Letter"');
	phantom.exit(1);


} else {
	console.log("rasterize.js   ", system.args.join(" "));
	address = system.args[1];
	output = system.args[2];
	console.log("ADDRESS: ", address, "\n");

	if (system.args.length > 3 && system.args[2].substr(-4) === ".pdf" && system.args[3]!='-') {
		size = system.args[3].split('*');
		page.paperSize = (size.length === 2) ?
			{ width: size[0], height: size[1], margin: '0px' }
			: { format: system.args[3], orientation: 'portrait', margin: '1cm' };
	}

	if (system.args.length > 4) {
		page.zoomFactor = system.args[4];
	}

	page.viewportSize = { width: 575, height: 400 };
	//page.viewportSize = { width: 1600, height: 1000 };


	page.onConsoleMessage = function(msg) {
		//console.log(msg);
		/*
		 * Ugly hacks, but only way to get messages out of the 'page.evaluate()'
		 * sandbox. If any, please contribute with improvements on this!
		 */

		if (msg === 'loadingdone') {
			window.setInterval(function() {
				console.log('\n\nWebpage says "loadingdone". We can exit Phantom. Bey!');
				page.render(output);
				phantom.exit();
			}, 500);
		}else{
			console.log("--------- Phantom browser console:");
			console.log(msg);
			console.log("----------------------------------");
		}

	};
	
	//page.onResourceRequested = function (request) {
	//	console.log("~~~~~~~|", request.method, request.url);
	//};
	//
	//page.onResourceReceived = function(response) {
	//	console.log("~~~~~~~~\\   RESPONSE", response.url);
	//};
	
	page.open(address, function (status) {
		console.log("[STATUS:"+status+"]");
		if (status !== 'success') {
			console.log('Unable to load the address!');
			phantom.exit(1);
		} else {

			window.setInterval(function(){
				console.log(".");
			},1000);

			window.setTimeout(function () {
				//console.log("CONTENT: ",page.content);
				console.log("\n\nTIME OUT!\nOUTPUT: ", output);
				page.render(output);
				phantom.exit(); // todo: should exit code be 1?
			}, 60000);
		}
	});
}

