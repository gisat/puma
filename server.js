var express = require('express');
var app = express();
var conn = require('./common/conn');
var publicConfig = require('./common/public-config');
var getCSS = require('./common/get-css');
var getMngCSS = require('./common/get-mng-css');
var staticFn = express['static'];
var session = require('express-session');

var async = require('async');
var loc = require('./common/loc');
var logger = require('./common/Logger').applicationWideLogger;

var config = require('./config');

process.on('uncaughtException', function (err) {
	logger.error("Caught exception: ", err);
});

function initServer(err) {
	if (err) {
		console.log('Error: while initializing server: ', err);
		return;
	}
	var oneDay = 60*60*24*1000;

	// Order is important

	// Log the requests to see then the error occurs.
	app.use(function(req, res, next) {
		logger.info("Request: "+ req.method + " - " + req.url);
		next();
	});

	//app.use(express.favicon());
	//app.use(express.favicon(__dirname + '/public/images/project-logo.png'));

	app.use('/printpublic',function(req,res,next) {
		if (req.path.search('.html')>-1 && req.path.search('index-for-export')<0) {
			return next(new Error('unauthorized'));
		}
		return next(null);
	});

	app.use('/config.js', publicConfig);
	app.use('/printpublic/config.js', publicConfig);

	app.use('/app.css', getCSS);
	app.use('/printpublic/app.css', getCSS);

	app.use('/app-mng.css', getMngCSS);


	app.use('extjs-4.1.3',staticFn(__dirname + '/public/extjs-4.1.3', {maxAge: oneDay*7})); // jen pro jistotu, ale mel by to vyridit uz Apache
	app.use('/printpublic',staticFn(__dirname + '/public'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(function(req, res, next){
		req.ssid = req.cookies.ssid || req.ssid || '';
		next();
	});
	app.use(loc.langParser);
    
	// Allow CORS on the node level.
    app.use(function(req, res, next) {
		// Allow CORS from anywhere.
		// TODO: Fix security issues.
		var url = req.headers.origin;
		res.header("Access-Control-Allow-Origin", url);
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, access-control-allow-credentials, access-control-allow-origin, content-type, cookie");
		res.header("Access-Control-Allow-Credentials", true);
		res.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS, DELETE");
		next();
    });
    // End of allow CORS.
	
	require('./routes/integration')(app);
	require('./routes/security')(app);
	require('./routes/routes')(app);
	require('./routes/finish')(app);
	require('./routes/iprquery')(app);
	app.use('/', staticFn(__dirname + '/public'));
	app.use('/ipr', staticFn(__dirname + '/public/ipr'));
	console.log('Going to listen on port ' + config.localPort + '...');
	app.listen(config.localPort);
	console.log('Listening on port ' + config.localPort);
}

async.series([
	function(callback) {
		conn.init(app,callback);
	},
	function(callback) {
		loc.init(callback);
	}],
	initServer
);
