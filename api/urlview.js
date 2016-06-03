var async = require('async');
var fs = require('fs');
var proxy = require('./proxy');
var conn = require('../common/conn');
var crud = require('../rest/crud');

function saveChart(params, req, res, callback) {
	var cfg = JSON.parse(params['cfg']);
	var collName = req.isView ? 'viewcfg' : 'chartcfg';
	if (cfg.type=='map') {
		for (var i=0;i<cfg.layers.length;i++) {
			var layer = cfg.layers[i];
			if (layer.sldId) {
				layer.sld = proxy.getSldSync(layer.sldId);
				delete layer.sldId;
			}
		}
	}
	crud.create(collName, cfg, {userId: req.userId}, function(err, result) {
		if (err) {
			return callback(err);
		}
		if (typeof result == "undefined"){
			return callback({message: "API/urlview.saveChart crud.create: result undefined"});
		}
		res.data = result._id;
		return callback(null);
	})

}

function getChart(params,req,res,callback) {
	var collName = req.isView ? 'viewcfg' : 'chartcfg';
	var filter = {_id: parseInt(params['_id'])};
		crud.read(collName,filter,function(err,result) {
			if (err) return callback(err);
			var cfg = result[0];
			if (cfg.type=='map') {
				var layers = cfg.layers;
				for (var i=0;i<layers.length;i++) {
					var layer = layers[i];
					if (layer.sld) {
						layer.sldId = proxy.setSldTemp(layer.sld);
					}
					delete layer.sld
				}
			}
			res.data = cfg;
			callback(null);
			crud.update(collName,{_id:cfg._id},{userId: req.userId, isAdmin: req.isAdmin},function(err,r){});
		})
}

function saveView(params,req,res,callback) {
	req.isView = true;
	saveChart(params,req,res,callback)
}

function getView(params,req,res,callback) {
	req.isView = true;
	getChart(params,req,res,callback)
}

module.exports = {
	saveChart: saveChart,
	getChart: getChart,
	saveView: saveView,
	getView: getView
};


