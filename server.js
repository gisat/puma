require('appoptics-apm');

const express = require('express');
const session = require('express-session');
const xmlparser = require('express-xml-bodyparser');

const logger = require('./src/common/Logger').applicationWideLogger;

const config = require('./config');

process.on('uncaughtException', function (err) {
	logger.error("Caught exception: ", err);
});

const PgDatabase = require(`./src/postgresql/PgDatabase`);

const PgPool = require('./src/postgresql/PgPool');
const CreateDefaultUserAndGroup = require('./src/migration/CreateDefaultUserAndGroup');
const PrepareForInternalUser = require('./src/migration/PrepareForInternalUser');

const CompoundAuthentication = require('./src/security/CompoundAuthentication');
const PgAuthentication = require('./src/security/PgAuthentication');
const SsoAuthentication = require('./src/security/SsoAuthentication');

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
	app.use(express.bodyParser({limit: '50mb', parameterLimit: 1000000}));
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
		let authenticators = [new PgAuthentication(pool, config.pgSchema.data)];
		if (config.toggles.useEoSso) {
			authenticators.unshift(new SsoAuthentication(pool, config.pgSchema.data));
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

	require('./src/routes/routes')(app, pool);

	logger.info('Going to listen on port ' + config.localPort + '...');
	let server = app.listen(config.localPort);
	server.setTimeout(600000);
	logger.info('Listening on port ' + config.localPort);
}


new PgDatabase(pool.pool())
	.ensure()
	.then(() => {
		return new CreateDefaultUserAndGroup(config.pgSchema.data).run();
	})
	.then(() => {
		return new PrepareForInternalUser(config.pgSchema.data).run();
	})
	.then(function () {
		// logger.info('Finished Migrations.');

		app = express();
		initServer();
	}).catch((err) => {
	logger.error('Error with Migration. Error: ', err);
});
