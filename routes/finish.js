var errMap = require('../common/errors').errMap;
var fs = require('fs');
var logger = require('../common/Logger').applicationWideLogger;

module.exports = function(app) {

	app.all('/rest/*',standardResponse);
	app.all('/restricted/rest/*',standardResponse);

	app.all('/api/*',standardResponse);

	app.all('/image/*',standardResponse);

	app.use(function(err,req,res,next) {
		logger.error("Error in processing request. Err: ", err, " Request: ", req.method, "-", req.url, "\n");
		var message = err.message;
		var status = 500;
		var errContext = errMap[err.message];
		if (errContext) {
			message = errContext.fn ? errContext.fn(req,err.errData) : message;
			status = errContext.status || 500;
		}
		var obj = {
			message: message,
			success: false
		};
		res.json(status,obj);
	})
};

var standardResponse = function(req,res,next) {
	var obj = {
		data: res.data,
		total: res.total,
		success: true
	};
	var status = res.stat || 200;
	if (res.downFile) {
		res.download(res.downFile[0],res.downFile[1],function(err) {
			//fs.unlink(res.downFile[0]);
		});
	} else if (res.contType) {
		res.set('Content-Type', res.contType);
		var buffer = new Buffer(res.data,res.encType || 'binary');
		res.send(buffer);
	} else if (res.isJson) {
		res.set('Content-Type', 'application/json');
		res.send(res.data);
	} else if (!res.noJson) {
		res.json(status,obj);
	} else {
		res.send(res.data);
	}
};
