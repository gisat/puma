var express = require('express');
var app = express();
var conn = require('./common/conn');
var publicConfig = require('./common/public-config');
var staticFn = express['static'];

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
	//app.use(express.favicon());
	//app.use(express.favicon(__dirname + '/public/images/project-logo.png'));
	app.use('/printpublic',function(req,res,next) {
		if (req.path.search('.html')>-1 && req.path.search('index-for-export')<0) {
			return next(new Error('unauthorized'));
		}
		return next(null);
	});

	// Log the requests to see then the error occurs.
	app.use(function(req, res, next) {
		console.log("Request: URL - " + req.url + " Method - " + req.method + "");
		next();
	});
	app.use('/config.js', publicConfig);
	app.use('/printpublic/config.js', publicConfig);

	app.use('extjs-4.1.3',staticFn(__dirname + '/public/extjs-4.1.3', {maxAge: oneDay*7})); // jen pro jistotu, ale mel by to vyridit uz Apache
	app.use('/printpublic',staticFn(__dirname + '/public'));
	app.use(express.cookieParser());
	app.use(express.bodyParser());
	app.use(loc.langParser);
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
