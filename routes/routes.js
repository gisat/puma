var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;

var Style = require('../styles/Style');
var UUID = require('../common/UUID');

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
	app.get('/restricted/rest/:objectType', function (req, res, next) {
		var objectType = req.params.objectType;
		logger.info("Requested restricted collection of type: ", objectType, " By User: ", req.userId);

		if (objectType != 'dataset' && objectType != 'scope') {
			return next(new Error('It is forbidden to use restricted for different type of objects.'));
		}

		crud.readRestricted(objectType, {
			userId: req.userId,
			justMine: req.query['justMine']
		}, function (err, result) {
			if (err) {
				logger.error("It wasn't possible to read restricted collection:", objectType, " by User:", req.userId, " Error: ", err);
				next(err);
			} else {
				res.data = result;
				next();
			}
		});
	});

	app.get('/rest/:objType',function(req,res,next) {
		logger.info("Requested collection of type: ", req.params.objType, " By User: ", req.userId);
		//var filter = req.query.filter ? JSON.parse(req.query.filter) : {};
		var filter = {};
		crud.read(req.params.objType,filter,{userId: req.userId, justMine: req.query['justMine']},function(err,result) {
			if (err){
				logger.error("It wasn't possible to read collection:", req.params.objType," by User:", req.userId, " Error: ", err);
				return next(err);
			}
			res.data = result;
			next();
		});
	});
	
	app.get('/rest/:objType/:objId',function(req,res,next) {
		logger.info("Requested item from collection: ", req.params.objType, " With Id: ", req.params.objId, " By User: ", req.userId);
		var filter = {_id: parseInt(req.params.objId)};
		crud.read(req.params.objType,filter,{userId: req.userId, justMine: req.query['justMine']},function(err,result) {
			if (err){
				logger.error("It wasn't possible to read item: ", req.params.objId, " from collection:", req.params.objType," by User:", req.userId, " Error: ", err);
				return next(err);
			}
			res.data = result;
			next();
		});
	});

	/**
	 * It sets up the object type used in specific collection.
	 */
	app.put('/rest/:objectType', function(req, res, next){
		req.objectType = req.params.objectType;
		next();
	});

	app.put('/rest/theme', function(req, res, next){
		// Whenever you create new theme also create associated topic, which must be used everywhere. What are the dependencies in the backend. In frontend it is relevant to associate correct years and stuff.
		logger.info("Create object of type: ", req.objectType, " by User: ", req.userId, "With data: ", req.body.data);

		var parameters = {
			userId: req.userId,
			isAdmin: req.isAdmin
		};
		var theme = req.body.data;
		crud.read('dataset', {_id: theme.dataset}, function(err, scopes){
			if (err) {
				logger.error("It wasn't possible to create object of type: ", req.params.objType, " by User: ", req.userId,
					"With data: ", theme, " Error:", err);
				return next(err);
			}

			if(scopes.length > 1) {
				return next(new Error('Either multiple Scopes with the same Id or multiple Scopes specified for one Theme.'));
			} else if(scopes.length == 1) {
				// Use the years from associated Scope, if such Scope already exists. If it doesn't the years are handle by the frontend.
				theme.years = scopes[0].years;
			}

			crud.update(req.objectType, theme, parameters, function (err, result) {
				if (err) {
					logger.error("It wasn't possible to create object of type: ", req.params.objType, " by User: ", req.userId,
						"With data: ", theme, " Error:", err);
					return next(err);
				} else {
					res.data = result;

					return next();
				}
			});
		});
	});

	app.put('/rest/analysis', function(req, res, next) {
		// Verify that the created analysis doesn't have attribute from the same attribute set as the source one.
		// calcAttributeSet a normAttributeSet u vsech atributu se musi lisit od source attribute setu
		var analysis = req.body.data;

		// Verify only when some attributes are present.
		if(analysis.attributeMap && analysis.attributeMap.length > 0) {
			analysis.attributeMap.forEach(function(attributeToAnalyse){
				if(attributeToAnalyse.calcAttributeSet == analysis.attributeSet || attributeToAnalyse.normAttributeSet == analysis.attributeSet) {
					return next(new Error("Attributes used in the analysis as a source attribute and as a reult attributes must be from differrent attribute sets."));
				}
			});
		}

		updateStandardRestObject(req, res, next);
	});


	// new backoffice
	function updateStandardRestObject(req,res,next) {
		logger.info("Update object of type: ", req.objectType, " by User: ", req.userId, "With data: ", req.body.data);
		var obj = req.body.data;

		crud.update(req.objectType,obj,{userId: req.userId,isAdmin:req.isAdmin},function(err,result) {
			if (err){
				logger.error("It wasn't possible to update object of type: ", req.objectType, " by User: ", req.userId,
					"With data: ", req.body.data, " Error:", err);
				return next(err);
			}
			res.data = result;
			next();
		});
	}

	app.put('/rest/dataset', updateStandardRestObject);
	app.put('/rest/scope', updateStandardRestObject);

	app.put('/rest/layergroup', updateStandardRestObject);
	app.put('/rest/layergroupgs', updateStandardRestObject);
	app.put('/rest/dataview', updateStandardRestObject);
	app.put('/rest/chartcfg', updateStandardRestObject);
	app.put('/rest/viewcfg', updateStandardRestObject);
	app.put('/rest/userpolygon', updateStandardRestObject);
	app.put('/rest/topic', updateStandardRestObject);
	app.put('/rest/performedanalysis', updateStandardRestObject);
	app.put('/rest/visualization', updateStandardRestObject);
	app.put('/rest/location', updateStandardRestObject);
	app.put('/rest/attributeset', updateStandardRestObject);
	app.put('/rest/attribute', updateStandardRestObject);
	app.put('/rest/layerref', updateStandardRestObject);
	app.put('/rest/areatemplate', updateStandardRestObject);
	app.put('/rest/year', updateStandardRestObject);


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

	/**
	 * It sets up the object type used in specific collection.
	 */
	app.post('/rest/:objectType', function(req, res, next){
		req.objectType = req.params.objectType;
		next();
	});

	app.post('/rest/symbology', function(req, res, next){
		var receivedData = req.body.data;

		if(!receivedData || !Style.validateDescription(receivedData)) {
			res.send(400, 'Request must contain valid data for generating SLD.');
			return;
		}

		var style = new Style(new UUID().toString(), receivedData);

		var sql = style.toSql();
		// Save to PostgreSQL;

		// Save to Mongo Database

		Promise.all([sqlPromise, mongoPromise]).then(function(){
			next();
		}, function(){
			next({
				message: 'Error in saving symbology.'
			});
		});
	});

	app.post('/rest/dataset', createStandardRestObject);
	app.post('/rest/scope', createStandardRestObject);

	app.post('/rest/theme', createStandardRestObject);
	app.post('/rest/layergroup', createStandardRestObject);
	app.post('/rest/layergroupgs', createStandardRestObject);
	app.post('/rest/dataview', createStandardRestObject);
	app.post('/rest/chartcfg', createStandardRestObject);
	app.post('/rest/viewcfg', createStandardRestObject);
	app.post('/rest/userpolygon', createStandardRestObject);
	app.post('/rest/topic', createStandardRestObject);
	app.post('/rest/analysis', createStandardRestObject);
	app.post('/rest/performedanalysis', createStandardRestObject);
	app.post('/rest/visualization', createStandardRestObject);
	app.post('/rest/location', createStandardRestObject);
	app.post('/rest/attributeset', createStandardRestObject);
	app.post('/rest/attribute', createStandardRestObject);
	app.post('/rest/layerref', createStandardRestObject);
	app.post('/rest/areatemplate', createStandardRestObject);
	app.post('/rest/year', createStandardRestObject);

	function createStandardRestObject(req, res, next) {
		logger.info("Create object of type: ", req.objectType, " by User: ", req.userId, "With data: ", req.body.data);
		crud.create(req.objectType, req.body.data, {userId: req.userId, isAdmin: req.isAdmin}, function (err, result) {
			if (err) {
				logger.error("It wasn't possible to create object of type: ", req.params.objType, " by User: ", req.userId,
					"With data: ", req.body.data, " Error:", err);
				return next(err);
			}
			res.data = result;
			next();
		});
	}

	// new backoffice
	app.delete('/rest/:objType',function(req,res,next) {
		logger.info("Delete object of type: ", req.params.objType, " by User: ", req.userId, "With data: ", req.body.data);
		var obj = req.body.data;
		crud.remove(req.params.objType, obj, {userId: req.userId, isAdmin:req.isAdmin}, function(err, result) {
			if (err){
				logger.error("It wasn't possible to delete object of type: ", req.params.objType, " by User: ", req.userId, "With data: ",
					req.body.data, "Error: ", err);
				return next(err);
			}
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