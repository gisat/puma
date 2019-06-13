var crud = require('../rest/crud');
let conn = require('../common/conn');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

var AnalysisController = require('./AnalysisController');
var AnalyticalUnitsController = require('../layers/AnalyticalUnitsController');
var AreaTemplateController = require('./AreaTemplateController');
var AreaController = require('../layers/AreaController');
var AttributeController = require('./AttributeController');
var AttributeSetController = require('./AttributeSetController');
var DataSetController = require('./DataSetController');
var DataViewController = require('./DataViewController');
var CustomFeaturesController = require('./CustomFeaturesController');
var ExportController = require('./ExportController');
var LayerGroupController = require('./LayerGroupController');
var LayerRefController = require('./LayerRefController');
var LocationController = require('./LocationController');
var LoginController = require('./LoginController');
var PerformedAnalysisController = require('./PerformedAnalysisController');
var StyleController = require('./StyleController');
var ThemeController = require('./ThemeController');
var TopicController = require('./TopicController');
var VisualizationController = require('./VisualizationController');
var YearController = require('./YearController');
var IntegrationController = require('../integration/GufIntegrationController');
let PermissionController = require('../security/UserController');
let GroupController = require('../security/GroupController');
let PgAnalysisController = require('../analysis/PgAnalysisController');
let LayerGeonodeController = require('../layers/LayerGeonodeController');
let LayerWmsController = require('../layers/wms/LayerWmsController');
let WpsController = require('../integration/WpsController');
let GeoServerLayersController = require('../layers/geoserver/GeoServerLayersController');
let AggregatedAnalyticalUnitsController = require('../data/AggregatedAnalyticalUnitsController');
let SharingController = require('../security/SharingController');
let VersionController = require('./VersionController');

var LodController = require('../linked_open_data/LodController');

var PgPool = require('../postgresql/PgPool');
var DatabaseSchema = require('../postgresql/DatabaseSchema');

let LayerImporterController = require('../integration/LayerImporterController');

let ImageMosaicController = require(`./ImageMosaicController`);

let SzifCaseCreatorController = require(`./SzifCaseCreatorController`);

const PgScenariosController = require('./PgScenariosController');
const PgScenarioCasesController = require('./PgScenarioCasesController');
const PgRelationsController = require('./PgRelationsController');
const PgSpatialDataSourcesController = require('./PgSpatialDataSourcesController');
const PgMetadataController = require('./PgMetadataController');
const PgPermissionController = require('./PgPermissionController');
const PgUserController = require('./PgUserController');
const LulcIntegrationController = require('./LulcIntegrationController');
const S3Bucket = require('../storage/S3Bucket');

const UploadManagerController = require('./UploadManagerController');

const PucsMatlabProcessorController = require('../integration/PucsMatlabProcessorController');

const GeoserverProxyController = require(`../geoserver/proxy/GeoserverProxyController`);

var api = {
	layers: require('../api/layers'),
	theme: require('../api/theme'),
	data: require('../api/data'),
	chart: require('../api/chart'),
	proxy: require('../api/proxy'),
	userpolygon: require('../api/userpolygon'),
	urlview: require('../api/urlview'),
	filter: require('../api/filter')
};

module.exports = function(app) {
	let viewsSchema = 'views';
	var pool = new PgPool({
		user: config.pgDataUser,
		database: config.pgDataDatabase,
		password: config.pgDataPassword,
		host: config.pgDataHost,
		port: config.pgDataPort
	});
	let poolRemote = null;
	if(config.pgDataUserRemote) {
		poolRemote = new PgPool({
			user: config.pgDataUserRemote,
			database: config.pgDataDatabaseRemote,
			password: config.pgDataPasswordRemote,
			host: config.pgDataHostRemote,
			port: config.pgDataPortRemote
		});
	}
	let mongo = conn.getMongoDb();
	new DatabaseSchema(pool, config.postgreSqlSchema).create();

	new StyleController(app, pool, mongo, config.postgreSqlSchema);
	new AnalysisController(app, pool);
	new AnalyticalUnitsController(app, pool, mongo);
	new AreaTemplateController(app, pool);
	if(poolRemote) {
		new ExportController(app, poolRemote, viewsSchema);
	} else {
		new ExportController(app, pool, viewsSchema);
	}
	new AttributeController(app, pool, poolRemote, mongo, viewsSchema);
	new LayerGeonodeController(app, pool);
	new LayerWmsController(app, pool, mongo);
	new AttributeSetController(app, pool);
	new DataSetController(app, pool);
	new DataViewController(app, pool, mongo);
	new CustomFeaturesController(app, pool);
	new LayerGroupController(app, pool);
	new LayerRefController(app, pool, mongo);
	new LocationController(app, pool);
	new LoginController(app, pool);
	new PerformedAnalysisController(app, pool);
	new ThemeController(app, pool);
	new TopicController(app, pool);
	new VisualizationController(app, pool, mongo);
	new YearController(app, pool);
	new IntegrationController(app, pool, mongo,'public',viewsSchema,config.postgreSqlSchema);
	new VersionController(app, '/opt/frontoffice/version.txt', '/opt/backoffice/version.txt', '/opt/backend/version.txt');

	new LodController(app, pool);
	new SharingController(app, pool, config.postgreSqlSchema, mongo);
	new PgAnalysisController(app, pool, mongo, config.postgreSqlSchema);
	new AreaController(app, pool, mongo);

	new WpsController(app, pool, config.postgreSqlSchema, mongo, null);

	new LayerImporterController(app, mongo, pool, config.postgreSqlSchema, config.pantherDataStoragePath);
	// Schema containing the imported data for Geoserver and schema for created views.
	new GeoServerLayersController(app, mongo, pool, config.postgreSqlSchema);
	new AggregatedAnalyticalUnitsController(app, pool, poolRemote, 'views');

	new ImageMosaicController(app);
	new SzifCaseCreatorController(app, pool, mongo);

	new PgRelationsController(app, pool, config.postgreSqlSchema);
	new PgSpatialDataSourcesController(app, pool, config.postgreSqlSchema);
	new PgMetadataController(app, pool, config.postgreSqlSchema, mongo);
	new PgUserController(app, pool, config.postgreSqlSchema, mongo);
	new LulcIntegrationController(app, mongo, pool, conn, new S3Bucket(config.aws.name, config.aws.accessKeyId, config.aws.secretAccessKey));

	new PgPermissionController(app, pool, config.postgreSqlSchema);

	new PermissionController(app, pool, config.postgreSqlSchema, mongo);
	new GroupController(app, pool);

	new UploadManagerController(app, pool, config.postgreSqlSchema, config.pantherDataStoragePath);

	new PucsMatlabProcessorController(app, pool, config.postgreSqlSchema, mongo);

	new GeoserverProxyController(app, pool, config.postgreSqlSchema, mongo);

	app.get('/api/chart/drawChart/:gid/:confId', function(req,res,next) {
		logger.info("/api/chart/drawChart/", req.params.gid, "/", req.params.confId, " by User: ", req.session.userId);
		var fn = api['chart']['drawChart'];
		req.query = {
			gid: req.params.gid,
			confId: req.params.confId
		};
		try {
			fn(req.query,req,res,next);
		} catch (err) {
			logger.error("It wasn't possible to draw chart", req.params.gid, "/", req.params.confId, " by User: ",
				req.session.userId, " Error: ", err);
			next(err);
		}
	});

	app.get('/api/proxy/wms',function(req,res,next) {
		logger.info("Call proxy by User: ", req.session.userId, " With params: ", req.query);
		var mod = api['proxy'];
		var fn = mod['wms'];
		try {
			fn(req.query,req,res,next);
		} catch (err) {
			logger.error("Error when calling proxy by User: ", req.session.userId, " With params: ", req.query, " Error: ", err);
			next(err);
		}
	});

	app.post('/api/:module/:method',function(req,res,next) {
		logger.info("Call method of API. Module: ", req.params.module, " Method: ", req.params.method, " by User: ", req.session.userId);
		var mod = api[req.params.module];
		var fn = mod[req.params.method];
		try {
			fn(req.body,req,res,next);
		} catch (err) {
			logger.error("Error when calling: ", req.params.module, "/", req.params.method, " By User: ",req.session.userId,
				"Error: ", err);
			next(err);
		}
	});
	
};
