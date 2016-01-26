var dataMod = require('./data');
var async = require('async');
var crud = require('../rest/crud');
var conn = require('../common/conn');

function getChart(params, callback) {
	params['aggregate'] = 'min,max';
	var attrs = JSON.parse(params['attrs']);
	var years = JSON.parse(params['years']);
	dataMod.getData(params,function(err,data) {
		if (err) return callback(err);
		dataMod.getAttrConf(params,function(err,attrConfs) {
			if (err) return callback(err);
			var result = [];
			for (var i=0;i<attrs.length;i++) {
				var attrObj = attrs[i];
				var as = attrObj.as;
				var attr = attrObj.attr;
				var normType = attrObj.normType || params['normalization'];
				var normAs = attrObj.normAs || params['normalizationAttributeSet'];
				var normAttr = attrObj.normAttr || params['normalizationAttribute'];
				var attrConf = attrConfs.attrMap[as][attr];
				var obj = {
					name: attrConf.name,
					units: attrConf.units,
					as: as,
					attr: attr,
					normType: normType,
					normAs: normAs,
					normAttr: normAttr
				};
				var min = null;
				var max = null;
				for (var j=0;j<years.length;j++) {
					var year = years[j];
					var attrName = 'as_'+as+'_attr_'+attr;
					attrName += years.length>1 ? ('_y_'+year) : '';
					var minVal = data.aggregate['min_'+attrName];
					var maxVal = data.aggregate['max_'+attrName];
					min = min!=null ? (Math.min(min,minVal)) : minVal;
					max = max!=null ? (Math.max(max,minVal)) : maxVal;
				}
				obj.min = Math.floor(min);
				obj.max = Math.ceil(max);
				result.push(obj);
			}
			return callback(null,result);
		})
	})

}

module.exports = {
	getChart: getChart
};

