var crud = require('../rest/crud');
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
		//var filter = req.query.filter ? JSON.parse(req.query.filter) : {};
		var filter = {};
		crud.read(req.params.objType,filter,{userId: req.userId, justMine: req.query['justMine']},function(err,result) {
			if (err) return next(err);
			res.data = result;
			next();
		})
	});
	
	app.get('/rest/:objType/:objId',function(req,res,next) {
		var filter = {_id: parseInt(req.params.objId)};
		crud.read(req.params.objType,filter,{userId: req.userId, justMine: req.query['justMine']},function(err,result) {
			if (err) return next(err);
			res.data = result;
			next();
		})
	});
	
	app.put('/rest/:objType/:objId',function(req,res,next) {
		var obj = req.body.data;
		if (obj._id != req.params.objId) {
			return next(new Error('updateid_notcorrect'))
		}
		crud.update(req.params.objType,obj,{userId: req.userId,isAdmin:req.isAdmin},function(err,result) {
			if (err) return next(err);
			res.data = result;
			next();
		})
	});
	
	
	
	app.post('/rest/:objType',function(req,res,next) {
		crud.create(req.params.objType,req.body.data,{userId: req.userId},function(err,result) {
			if (err) return next(err);
			res.data = result;
			next();
		})
	});
	
	app.delete('/rest/:objType/:objId',function(req,res,next) {
		crud.remove(req.params.objType,{_id: parseInt(req.params.objId)},{userId: req.userId,isAdmin:req.isAdmin},function(err,result) {
			if (err) return next(err);
			next();
		})
	});
	
	
	app.post('/print/*',function(req,res,next) {
		try {
			api.print.exporter({download:true},req,res,next);
		}
		catch (err) {
			next(err);
		}
	});
	app.get('/image/*',function(req,res,next) {
		try {
			api.print.exporter({},req,res,next);
		}
		catch (err) {
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
		var fn = api['chart']['drawChart'];
		req.query = {
			gid: req.params.gid,
			confId: req.params.confId
		};
		try {
			fn(req.query,req,res,next)
		}
		catch (err) {
			next(err);
		}
	});

	app.get('/api/proxy/wms',function(req,res,next) {
		var mod = api['proxy'];
		var fn = mod['wms'];
		try {
			fn(req.query,req,res,next);
		}
		catch (err) {
			next(err);
		}
	});
	app.post('/api/:module/:method',function(req,res,next) {
		console.log();
		var mod = api[req.params.module];
		var fn = mod[req.params.method];
		try {
			fn(req.body,req,res,next);
		}
		catch (err) {
			next(err);
		}
		  
	})
	
	
	
	
};


