require('appoptics-apm');

const cluster = require('cluster');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

if(cluster.isMaster) {
    var cpuCount = require('os').cpus().length;
    console.log('CpuFull', cpuCount);
    cpuCount = Math.ceil(cpuCount / 2);
    console.log('Cpu Count: ', cpuCount);

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
    
    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.id + ' is online.');
    });
	
    cluster.on('exit', (worker, code, signal) => {
      if (code !== 0 && !worker.exitedAfterDisconnect) {
        console.log(`Worker ${worker.id} crashed. ` +
                    'Starting a new worker...');
        cluster.fork();
      }
    });
} else {

const conn = require('./common/conn');
const staticFn = express['static'];
const xmlparser = require('express-xml-bodyparser');

const async = require('async');
const loc = require('./common/loc');
const logger = require('./common/Logger').applicationWideLogger;

const config = require('./config');

process.on('uncaughtException', function (err) {
	logger.error("Caught exception: ", err);
});

const PgPool = require('./postgresql/PgPool');
const DatabaseSchema = require('./postgresql/DatabaseSchema');

const CompoundAuthentication = require('./security/CompoundAuthentication');
const PgAuthentication = require('./security/PgAuthentication');
const SsoAuthentication = require('./security/SsoAuthentication');

const pool = new PgPool({
    user: config.pgDataUser,
    database: config.pgDataDatabase,
    password: config.pgDataPassword,
    host: config.pgDataHost,
    port: config.pgDataPort
});

let app;
function initServer(err) {
	logger.info('server#initServer Initialize the server.');

	if (err) {
		console.log('Error: while initializing server: ', err);
		return;
	}
	// Order is important
    
    // Limit size of uploaded files
    app.use(express.limit('2048mb'));

	// Log the requests to see when the error occurs.
	app.use(function(req, res, next) {
		logger.info("Request: "+ req.method + " - " + req.url);
		next();
	});

	app.use(express.cookieParser());
    app.use(express.bodyParser({limit: '50mb', parameterLimit: 1000000}));
	app.use(xmlparser());
	app.use(session({
		store: new pgSession({
			pool: pool,
			schemaName: 'data'
		}),
		secret: "panther",
		resave: false,
		saveUninitialized: false
	}));
	app.use(function (request, response, next) {
		response.locals.ssid = request.cookies.sessionid;
		response.locals.isAdmin = request.session.groups && request.session.groups.indexOf("admingroup") != -1;
		next();
	});
	app.use(loc.langParser);
	app.use(function(request, response, next){
		if(request.session && !request.session.sldMap) {
			request.session.sldMap = {};
		}
		
		if(request.session && !request.session.sldMapTemp) {
			request.session.sldMapTemp = {};
		}
		
		if(request.session && !request.session.densityMap) {
			request.session.densityMap = {};
		}
		
		if(request.session && !request.session.chartConfMap) {
			request.session.chartConfMap = {};
		}
		
		if(request.session && !request.session.confMap) {
			request.session.confMap = {};
		}
		
		next();
	});
    
	// Allow CORS on the node level.
    app.use(function(req, res, next) {
		// TODO: Fix security issues.
		var url = req.headers.origin || 'http://localhost:63342';
		res.header("Access-Control-Allow-Origin", url);
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, access-control-allow-credentials, access-control-allow-origin, content-type, cookie");
		res.header("Access-Control-Allow-Credentials", true);
		res.header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS, DELETE");
		next();
    });
    // End of allow CORS.

	// Make sure that every request knows the current information about user.
	app.use((request, response, next) => {
		let authenticators = [new PgAuthentication(pool, config.postgreSqlSchema)];
		if(config.toggles.useEoSso) {
			authenticators.unshift(new SsoAuthentication(pool, config.postgreSqlSchema));
		}

		new CompoundAuthentication(authenticators).authenticate(request, response, next).then(() => {
			logger.info('server#authentication User: ', request.session.user.id);
			if(!request.session.user && config.toggles.loggedOnly) {
				logger.info('server#authentication User not logged in');
				response.redirect(config.notAuthenticatedUrl);
			} else {
				next();
			}
		}).catch(err => {
			logger.error(`server#authentication Error: `, err);
			if(config.toggles.loggedOnly) {
				response.redirect(config.notAuthenticatedUrl);
			}
		})
	});

	require('./routes/routes')(app);
	require('./routes/finish')(app);
	app.use('/', staticFn(__dirname + '/public'));
	app.use('/ipr', staticFn(__dirname + '/public/ipr'));

	logger.info('Going to listen on port ' + config.localPort + '...');
    let server = app.listen(config.localPort);
    server.setTimeout(600000);
	logger.info('Listening on port ' + config.localPort);
}

const schema = new DatabaseSchema(pool, config.postgreSqlSchema);
schema.create().then(function(){
	return schema.migrate();
}).then(function(){
	logger.info('Finished Migrations.');

	app = express();
	async.series([
			function(callback) {
				conn.init(app,callback);
			},
			function(callback) {
				loc.init(callback);
			}],
		initServer
	);
}).catch((err) => {
	logger.error('Error with Migration. Error: ', err);
});

}
