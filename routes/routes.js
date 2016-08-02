var crud = require('../rest/crud');
var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;

var AnalysisController = require('./AnalysisController');
var AreaTemplateController = require('./AreaTemplateController');
var AttributeController = require('./AttributeController');
var AttributeSetController = require('./AttributeSetController');
var ChartCfgController = require('./ChartCfgController');
var DataSetController = require('./DataSetController');
var DataViewController = require('./DataViewController');
var LayerGroupController = require('./LayerGroupController');
var LayerRefController = require('./LayerRefController');
var LocationController = require('./LocationController');
var PerformedAnalysisController = require('./PerformedAnalysisController');
var ScopeController = require('./ScopeController');
var StyleController = require('./StyleController');
var ThemeController = require('./ThemeController');
var TopicController = require('./TopicController');
var UserPolygonController = require('./UserPolygonController');
var ViewCfgController = require('./ViewCfgController');
var VisualizationController = require('./VisualizationController');
var YearController = require('./YearController');

var PgPool = require('../postgresql/PgPool');
var DatabaseSchema = require('../postgresql/DatabaseSchema');

var api = {
	login: require('../api/login'),
	layers: require('../api/layers'),
	theme: require('../api/theme'),
	data: require('../api/data'),
	chart: require('../api/chart'),
	proxy: require('../api/proxy'),
	analysis: require('../api/analysis'),
	userpolygon: require('../api/userpolygon'),
	urlview: require('../api/urlview'),
	filter: require('../api/filter'),
	print: require('../api/print')
};

module.exports = function(app) {
	var pool = new PgPool({
		user: config.pgDataUser,
		database: config.pgDataDatabase,
		password: config.pgDataPassword,
		host: config.pgDataHost,
		port: config.pgDataPort
	});
	new DatabaseSchema(pool, config.postgreSqlSchema).create();

	new StyleController(app, pool, config.postgreSqlSchema);
	new AnalysisController(app);
	new AreaTemplateController(app);
	new AttributeController(app);
	new AttributeSetController(app);
	new ChartCfgController(app);
	new DataSetController(app);
	new DataViewController(app);
	new LayerGroupController(app);
	new LayerRefController(app);
	new LocationController(app);
	new PerformedAnalysisController(app);
	new ScopeController(app);
	new ThemeController(app);
	new TopicController(app);
	new UserPolygonController(app);
	new ViewCfgController(app);
	new VisualizationController(app);
	new YearController(app);

	// old backoffice
	app.put('/rest/:objType/:objId',function(req,res,next) {
		var obj = req.body.data;

		// test if URL id equals PUT DATA id
		if (obj._id != req.params.objId) {
			return next(new Error('updateid_notcorrect'))
		}
		crud.update(req.params.objType,obj,{userId: req.userId,isAdmin:req.isAdmin},function(err,result) {
			if (err){
				return next(err);
			}
			res.data = result;
			next();
		});
	});

	// old backoffice
	app.delete('/rest/:objType/:objId',function(req,res,next) {
		crud.remove(req.params.objType,{_id: parseInt(req.params.objId)},{userId: req.userId,isAdmin:req.isAdmin},function(err,result) {
			if (err){
				return next(err);
			}
			next();
		});
	});

	
	app.post('/print/*',function(req,res,next) {
		logger.info("Print requested by user: ", req.userId);
		try {
			api.print.exporter({download:true},req,res,next);
		} catch (err) {
			logger.error("It wasn't possible to print data requested by user: ", req.userId, " Error: ", err);
			next(err);
		}
	});
	app.get('/image/*',function(req,res,next) {
		logger.info("Image export requested by user: ", req.userId);
		try {
			api.print.exporter({},req,res,next);
		} catch (err) {
			logger.error("It wasn't possible to export image requested by user: ", req.userId, " Error: ", err);
			next(err);
		}
	});

	app.get('/api/verify/scope/:id', function(req, res, next){
		// Load information about Scope and all associated Entities.
		// 
	});
	
	app.get('/api/chart/drawChart/:gid/:confId', function(req,res,next) {
		logger.info("/api/chart/drawChart/", req.params.gid, "/", req.params.confId, " by User: ", req.userId);
		var fn = api['chart']['drawChart'];
		req.query = {
			gid: req.params.gid,
			confId: req.params.confId
		};
		try {
			fn(req.query,req,res,next);
		} catch (err) {
			logger.error("It wasn't possible to draw chart", req.params.gid, "/", req.params.confId, " by User: ",
				req.userId, " Error: ", err);
			next(err);
		}
	});

	app.get('/api/proxy/wms',function(req,res,next) {
		logger.info("Call proxy by User: ", req.userId, " With params: ", req.query);
		var mod = api['proxy'];
		var fn = mod['wms'];
		try {
			fn(req.query,req,res,next);
		} catch (err) {
			logger.error("Error when calling proxy by User: ", req.userId, " With params: ", req.query, " Error: ", err);
			next(err);
		}
	});

	app.get('/api/analysis/status', function(request, response, next){
		logger.info("Call status of analysis User: ", request.userId, " With params: ", request.query);

		api.analysis.status(request, response);
	});

	app.post('/api/:module/:method',function(req,res,next) {
		logger.info("Call method of API. Module: ", req.params.module, " Method: ", req.params.method, " by User: ", req.userId);
		var mod = api[req.params.module];
		var fn = mod[req.params.method];
		try {
			fn(req.body,req,res,next);
		} catch (err) {
			logger.error("Error when calling: ", req.params.module, "/", req.params.method, " By User: ",req.userId,
				"Error: ", err);
			next(err);
		}
	});
	
};