var errMap = require('../common/errors').errMap;
var fs = require('fs');

module.exports = function(app) {

	app.all('/rest/*',standardResponse);

	app.all('/api/*',standardResponse);

	app.all('/print/*',standardResponse);
	app.all('/image/*',standardResponse);

	app.use(function(err,req,res,next) {
		console.log(err.stack);
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
	} else if (!res.noJson) {
		res.json(status,obj);
	} else {
		res.send(res.data);
	}
};
