require('newrelic');

var express = require('express');
var app = express();
var conn = require('./common/conn');
var getCSS = require('./common/get-css');
var getMngCSS = require('./common/get-mng-css');
var staticFn = express['static'];
var session = require('express-session');
let xmlparser = require('express-xml-bodyparser');

var async = require('async');
var loc = require('./common/loc');
var logger = require('./common/Logger').applicationWideLogger;

var config = require('./config');

let DirectoryCreator = require('./snow/DirectoryCreator');
let ProcessManager = require(`./snow/ProcessManager`);
let ScenesStatisticsStorage = require(`./snow/ScenesStatisticsStorage`);
let CompositeManager = require(`./snow/CompositeManager`);
let CompositesStatisticsStorage = require(`./snow/CompositesStatisticsStorage`);
let FileSystemManager = require(`./snow/FileSystemManager`);
let NotificationWatchdog = require(`./snow/NotificationWatchdog`);

process.on('uncaughtException', function (err) {
    logger.error("Caught exception: ", err);
});

var SymbologyToPostgreSqlMigration = require('./migration/SymbologyToPostgreSql');
var PgPool = require('./postgresql/PgPool');
var DatabaseSchema = require('./postgresql/DatabaseSchema');
let CreateDefaultUserAndGroup = require('./migration/CreateDefaultUserAndGroup');
let IdOfTheResourceMayBeText = require('./migration/IdOfTheResourceMayBeText');
let PrepareForInternalUser = require('./migration/PrepareForInternalUser');
let AddCustomInfoToWms = require('./migration/AddCustomInfoToWms');

let CompoundAuthentication = require('./security/CompoundAuthentication');
let PgAuthentication = require('./security/PgAuthentication');
let SsoAuthentication = require('./security/SsoAuthentication');

var pool = new PgPool({
    user: config.pgDataUser,
    database: config.pgDataDatabase,
    password: config.pgDataPassword,
    host: config.pgDataHost,
    port: config.pgDataPort
});

var app;

// TODO: Move to the API instead of public.
function initServer(err) {
    logger.info('server#initServer Initialize the server.');

    if (err) {
        console.log('Error: while initializing server: ', err);
        return;
    }
    // Order is important

    // Limit size of uploaded files
    app.use(express.limit('256mb'));

    // Log the requests to see when the error occurs.
    app.use(function (req, res, next) {
        logger.info("Request: " + req.method + " - " + req.url);
        next();
    });

    app.use('/app.css', getCSS);
    app.use('/app-mng.css', getMngCSS);

    app.use(express.cookieParser());
    app.use(express.bodyParser({limit: '50mb'}));
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

    require('./routes/security')(app);
    require('./routes/routes')(app);
    require('./routes/finish')(app);
    app.use('/', staticFn(__dirname + '/public'));
    app.use('/ipr', staticFn(__dirname + '/public/ipr'));

    logger.info('Going to listen on port ' + config.localPort + '...');
    app.listen(config.localPort);
    logger.info('Listening on port ' + config.localPort);
}

function prepareSnowDirecotries() {
    if (config.hasOwnProperty('snow') && config.snow.hasOwnProperty('paths')) {
        for (let pathKey of Object.keys(config.snow.paths)) {
            let path = config.snow.paths[pathKey];
            DirectoryCreator.createFullPathDirectory(path).catch(error => {
                console.error(error);
            });
        }
    }
    if (config.hasOwnProperty(`webArchivePath`)) {
        let path = config.webArchivePath;
        DirectoryCreator.createFullPathDirectory(path).catch(error => {
            console.error(error);
        });
    }
}

new DatabaseSchema(pool, config.postgreSqlSchema).create().then(function () {
    return new SymbologyToPostgreSqlMigration().run();
}).then(() => {
    return new CreateDefaultUserAndGroup(config.postgreSqlSchema).run();
}).then(() => {
    return new IdOfTheResourceMayBeText(config.postgreSqlSchema).run();
}).then(() => {
    return new PrepareForInternalUser(config.postgreSqlSchema).run();
}).then(() => {
    return new AddCustomInfoToWms(config.postgreSqlSchema).run();
}).then(function () {
    logger.info('Finished Migrations.');
}).then(() => {
    prepareSnowDirecotries();
}).then(() => {
    ProcessManager.initProcessPgTable(pool)
        .then(() => {
            return ProcessManager.clearUnfinishedProcesses(pool);
        });
    ScenesStatisticsStorage.initScenesStatisticsPgTable(pool);
    CompositeManager.initCompositesPgTable(pool)
        .then(() => {
            return CompositeManager.clearUnfinishedComposites(pool);
        })
        .then(() => {
            return CompositeManager.initDurationPgTable(pool);
        })
        .then(() => {
            return CompositeManager.updateCompositeKeys(pool);
        })
        .then(() => {
            CompositesStatisticsStorage.initCompositesStatisticsPgTable(pool);
        });
    CompositeManager.initMetadataPgTable(pool)
        .then(() => {
            return CompositeManager.clearMetadataWithoutComposites(pool);
        });
    FileSystemManager.initFileSystemManagerPgTable(pool);
    NotificationWatchdog.initNotificationWatchdogPgTable(pool)
        .then(() => {
            return NotificationWatchdog.clearUnfinished(pool);
        })
        .then(() => {
            NotificationWatchdog.watchDog(pool);
        });
}).then(() => {
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
}).catch((err) => {
    logger.error('Error with Migration. Error: ', err);
});
