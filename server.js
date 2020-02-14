require('appoptics-apm');

const express = require('express');
const conn = require('./common/conn');
const staticFn = express['static'];
const session = require('express-session');
const xmlparser = require('express-xml-bodyparser');

const async = require('async');
const loc = require('./common/loc');
const logger = require('./common/Logger').applicationWideLogger;

const config = require('./config');

process.on('uncaughtException', function (err) {
	logger.error("Caught exception: ", err);
});

const PgDatabase = require(`./postgresql/PgDatabase`);

const SymbologyToPostgreSqlMigration = require('./migration/SymbologyToPostgreSql');
const PgPool = require('./postgresql/PgPool');
const CreateDefaultUserAndGroup = require('./migration/CreateDefaultUserAndGroup');
const IdOfTheResourceMayBeText = require('./migration/IdOfTheResourceMayBeText');
const PrepareForInternalUser = require('./migration/PrepareForInternalUser');
const AddCustomInfoToWms = require('./migration/AddCustomInfoToWms');
const MigrateAwayFromGeonode = require('./migration/MigrateAwayFromGeonode');
const AddAuditInformation = require('./migration/AddAuditInformation');
const AddGetDatesToWmsLayers = require('./migration/AddGetDatesToWmsLayers');
const AddPhoneToUser = require('./migration/AddPhoneToUser');
const AddMetadataToLayer = require('./migration/2_10_1_AddMetadataToLayer');
const AddSourceUrlToLayer = require('./migration/2_12_AddSourceUrlToLayer');

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
	app.use(function (req, res, next) {
		logger.info("Request: " + req.method + " - " + req.url);
		next();
	});

	app.use(express.cookieParser());
	app.use(express.bodyParser({limit: '2048mb', parameterLimit: 1000000}));
	app.use(xmlparser());
	app.use(session({
		name: "panthersid",
		secret: "panther",
		resave: false,
		saveUninitialized: true
	}));
	app.use(function (request, response, next) {
		response.locals.ssid = request.cookies.sessionid;
		response.locals.isAdmin = request.session.groups && request.session.groups.indexOf("admingroup") != -1;
		next();
	});
	app.use(loc.langParser);

	// Allow CORS on the node level.
	app.use(function (req, res, next) {
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
		if (config.toggles.useEoSso) {
			authenticators.unshift(new SsoAuthentication(pool, config.postgreSqlSchema));
		}

		new CompoundAuthentication(authenticators).authenticate(request, response, next).then(() => {
			logger.info('server#authentication User: ', request.session.user.id);
			if (!request.session.user && config.toggles.loggedOnly) {
				logger.info('server#authentication User not logged in');
				response.redirect(config.notAuthenticatedUrl);
			} else {
				next();
			}
		}).catch(err => {
			logger.error(`server#authentication Error: `, err);
			if (config.toggles.loggedOnly) {
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

new PgDatabase(pool.pool())
	.ensure()
	.then(() => {
		app = express();
		async.series([
				function (callback) {
					conn.init(app, callback);
				},
				function (callback) {
					loc.init(callback);
				}],
			initServer
		);
	})
	.catch((error) => {
		console.log(error);
	});
