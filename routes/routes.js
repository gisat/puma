var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;

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
	app.post('/rest/:objType', crud.ensureCollection);
	app.post('/rest/:objType/*', crud.ensureCollection);
	
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


	// new backoffice
	app.put('/rest/:objType',function(req,res,next) {
		logger.info("Update object of type: ", req.params.objType, " by User: ", req.userId, "With data: ", req.body.data);
		var obj = req.body.data;

		crud.update(req.params.objType,obj,{userId: req.userId,isAdmin:req.isAdmin},function(err,result) {
			if (err){
				logger.error("It wasn't possible to update object of type: ", req.params.objType, " by User: ", req.userId,
					"With data: ", req.body.data, " Error:", err);
				return next(err);
			}
			res.data = result;
			next();
		});
	});
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


	app.post('/rest/:objType',function(req,res,next) {
		logger.info("Create object of type: ", req.params.objType, " by User: ", req.userId, "With data: ", req.body.data);
		crud.create(req.params.objType,req.body.data,{userId: req.userId,isAdmin:req.isAdmin},function(err,result) {
			if (err){
				logger.error("It wasn't possible to create object of type: ", req.params.objType, " by User: ", req.userId,
					"With data: ", req.body.data, " Error:", err);
				return next(err);
			}
			res.data = result;
			next();
		});
	});


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
	
//	app.get('/api/:module/:method',function(req,res,next) {
//		var mod = api[req.params.module];
//		var fn = mod[req.params.method];
//		console.log(fn)
//		try {
//			fn(req.query,req,res,next)
//		}
//		catch (err) {
//			next(err);
//		}
//	})
	
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