var express = require('express');
var app = express();
var conn = require('./common/conn');
var publicConfig = require('./common/public-config');
var staticFn = express['static'];
var session = require('express-session');

var async = require('async');
var loc = require('./common/loc');
var logger = require('./common/Logger').applicationWideLogger;

var config = require('./config');

process.on('uncaughtException', (err) => {
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

	/*
	#######################################################################
	Nastaveni apache.conf pro servirovani statickych souboru primo Apachem:

	Alias /help /var/www/puma-app/public/help/

	#### /tool/* static routing
	RedirectMatch 301 ^/tool$ /tool/
	RedirectMatch 301 ^/catalogue/(.*)$ /catalogue/$1

	AliasMatch ^/tool/$ /var/www/puma-app/public/data-exploration.html
	Alias /tool/css /var/www/puma-app/public/css
	Alias /tool/ux /var/www/puma-app/public/ux
	Alias /tool/_main /var/www/puma-app/public/_main
	Alias /tool/_common /var/www/puma-app/public/_common
	Alias /tool/images /var/www/puma-app/public/images
	Alias /tool/devlib /var/www/puma-app/public/devlib
	Alias /tool/lib /var/www/puma-app/public/lib
	Alias /tool/gisatlib /var/www/puma-app/public/gisatlib
	Alias /tool/extjs-4.1.3 /var/www/puma-app/public/extjs-4.1.3

	ProxyPassMatch ^/tool/?$ !
	ProxyPass /tool/css !
	ProxyPass /tool/ux !
	ProxyPass /tool/_main !
	ProxyPass /tool/_common !
	ProxyPass /tool/images !
	ProxyPass /tool/devlib !
	ProxyPass /tool/lib !
	ProxyPass /tool/gisatlib !
	ProxyPass /tool/extjs-4.1.3 !

	#### /tool* non-static routing (and some minor static, not covered by above code)
	ProxyPass /tool http://127.0.0.1:3000
	ProxyPassReverse /tool http://127.0.0.1:3000
	 */

	app.use('/config.js', publicConfig);
	app.use('/printpublic/config.js', publicConfig);

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
	app.use('/', staticFn(__dirname + '/public'));
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
