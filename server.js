var express = require('express');
var app = express();
var conn = require('./common/conn');
var publicConfig = require('./common/public-config');
var staticFn = express['static'];
var session = require('express-session');

var async = require('async');
var loc = require('./common/loc');

var config = require('./config');

function initServer(err) {
	if (err) {
		console.log('Error: while initializing server: ', err);
		return;
	}
	// Order is important
	var oneDay = 60*60*24*1000;
	app.use('/printpublic',function(req,res,next) {
		if (req.path.search('.html')>-1 && req.path.search('index3')<0) {
			return next(new Error('unauthorized'));
		}
		return next(null);
	});

	// Log the requests to see then the error occurs.
	app.use(function(req, res, next) {
		console.log("Request: URL - " + req.url + " Method - " + req.method + "");
		next();
	});
	// End of logging
	// Make sure the session id is available
	app.use(session({
		secret: '34SDgsdgspxxxxxxxdfsG', // just a long random string
		resave: false,
		saveUninitialized: true
	}));
	// End of session Id. 
	app.use('/config.js', publicConfig);
	app.use('/printpublic/config.js', publicConfig);

	app.use('extjs-4.1.3',staticFn(__dirname + '/public/extjs-4.1.3', {maxAge: oneDay*7})); // jen pro jistotu, ale mel by to vyridit uz Apache
	app.use('/printpublic',staticFn(__dirname + '/public'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(loc.langParser);
    // Allow CORS on the node level.
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", config.allowedOrigins);
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		res.header("Access-Control-Allow-Credentials", true);
        next();
    });
    // End of allow CORS.
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
