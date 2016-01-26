var dataMod = require('./dataspatial');
var async = require('async');
var crud = require('../rest/crud');

function getChart(params, callback) {
	var width = params['width'] || 535;
	var height = params['height'] || 150;

	var opts = {
		data: function(asyncCallback) {
			params['limit'] = 150;
			dataMod.getData(params, function(err, dataObj) {
				if (err)
					return callback(err);
				return asyncCallback(null, dataObj);
			})
		},
		res: ['data', function(asyncCallback, results) {
				var html = results.data + '';
				var left = 265 - html.length * 10;
				switch (html.length) {
					case 1:
						left = 265;
						break;
					case 2:
						left = 255;
						break;
					case 3:
						left = 240;
						break;
					case 4:
						left = 228;
						break;
				}
				var conf = {
					chart: {
					},
					title: {
						text: params['title']
					},
					credits: {
						enabled: false
					},
					labels: {items: [{
								html: html,
								style: {
									left: left + 'px',
									top: '48px',
									fontSize: 40,
									color: '#999999'

								}
							}]}};
				return callback(null, conf)
			}]
	};

	async.auto(opts);

}
module.exports = {
	getChart: getChart
};

