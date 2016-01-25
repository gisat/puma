var properties = require('properties');
var async = require('async');

var cultures = ['cs_CZ'];
var defLang = 'en_US';
var loc = {};

var config = {
	comment: "# ",
	separator: " = ",
	sections: false
};

function init(callback) {
	//console.log('loc.init');
	cultures.push('');
	async.forEach(cultures,function(item,asyncCallback) {

		var fileName = item ? "resources/loc_"+item+".properties" : "resources/loc.properties";
		properties.load (fileName, config, function (err, p){
			if (err) console.log('lang '+(item || 'default')+' not found');
			if (err) return asyncCallback(err);
			p.get = get;
			loc[item || defLang] = p;
			return asyncCallback();
		});
	}, function(err) {
		if (err) return callback(err);
		return callback();
	});
}

function langParser(req,res,callback) {
	var lang = req.query ? req.query['lang'] : null;
	lang = lang || (req.body ? req.body['lang'] : null);
	lang = lang || defLang;
	req.loc = loc[lang] ? loc[lang] : loc[defLang];
	callback();
}

var get = function(key,arr) {

	if (!arr) arr = [];
	if (!arr.length) arr = [arr];
	var text = this[key] || '&noloc';
	for (var i=0;i<arr.length;i++) {
		var subst = '{'+i+'}';
		text = text.replace(subst,arr[i]);
	}
	return text;
};

module.exports = {
	init: init,
	langParser: langParser
};