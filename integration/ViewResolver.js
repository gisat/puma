var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var deepcopy = require('deepcopy');
var _ = require('underscore');
var request = require('request');

// todo replace with correct data (correct scope, year, layers, visualization, etc.)
var baseView = {
	"name": "",
	"conf": {
		"multipleMaps": false,
		"years": [
			278
		],
		"dataset": 2449,
		"theme": 1372,
		"visualization": 4653,
		"location": "2450_39",
		"expanded": {
			"2450": {
				"1426": [
					39
				]
			}
		},
		"selMap": {
			"ff4c39": []
		},
		"choroplethCfg": [
			{
				"as": 2656,
				"attr": 383,
				"normType": "area",
				"normAs": "",
				"normAttr": "",
				"normYear": "",
				"attrNameNormalized": "",
				"checked": false,
				"numCategories": 7,
				"classType": "quantiles",
				"zeroesAsNull": true,
				"name": "Share of built-up land (%)",
				"attrName": "Built-up land",
				"asName": "Built-up areas"
			}
		],
		"pagingUseSelected": false,
		"pagingSelectedColors": [
			"ff4c39",
			"34ea81",
			"39b0ff",
			"ffde58",
			"5c6d7e",
			"d97dff"
		],
		"filterMap": {},
		"filterActive": false,
		"layers": [
			{
				"opacity": 0.7,
				"sortIndex": 0,
				"type": "selectedareasfilled",
				"attributeSet": "",
				"attribute": "",
				"at": "",
				"symbologyId": ""
			},
			{
				"opacity": 0.7,
				"sortIndex": 1,
				"type": "areaoutlines",
				"attributeSet": "",
				"attribute": "",
				"at": "",
				"symbologyId": ""
			},
			{
				"opacity": 0.7,
				"sortIndex": 2,
				"type": "topiclayer",
				"attributeSet": "",
				"attribute": "",
				"at": 3664,
				"symbologyId": "#blank#"
			},
			{
				"opacity": 1,
				"sortIndex": 10000,
				"type": "terrain",
				"attributeSet": "",
				"attribute": "",
				"at": "",
				"symbologyId": ""
			}
		],
		"trafficLayer": false,
		"page": 1,
		"mapCfg": {
			"center": {
				"lon": 11793025.757714,
				"lat": 1228333.4862894
			},
			"zoom": 7
		},
		"cfgs": [
			{
				"cfg": {
					"title": "Share of built-up land (% of total area)",
					"type": "columnchart",
					"attrs": [
						{
							"as": 2656,
							"attr": 383,
							"normType": "area",
							"normAs": "",
							"normAttr": "",
							"normYear": "",
							"attrNameNormalized": "",
							"checked": true,
							"numCategories": "",
							"classType": "",
							"zeroesAsNull": "",
							"name": "",
							"attrName": "Built-up land",
							"asName": "Built-up areas"
						}
					],
					"featureLayerOpacity": "70",
					"classType": "quantiles",
					"numCategories": "3",
					"constrainFl": [
						0,
						3
					],
					"stacking": "none",
					"chartId": 2527177
				},
				"queryCfg": {
					"invisibleAttrs": [],
					"invisibleYears": []
				}
			},
			{
				"cfg": {
					"title": "Total area of built-up land",
					"type": "grid",
					"attrs": [
						{
							"as": 2656,
							"attr": 383,
							"normType": null,
							"normAs": null,
							"normAttr": null,
							"normYear": "",
							"attrNameNormalized": "",
							"checked": false,
							"numCategories": "",
							"classType": "",
							"zeroesAsNull": "",
							"name": "",
							"attrName": "Built-up land",
							"asName": "Built-up areas"
						}
					],
					"featureLayerOpacity": "70",
					"classType": "quantiles",
					"numCategories": "3",
					"constrainFl": [
						0,
						3
					],
					"stacking": "none",
					"chartId": 7474946
				},
				"queryCfg": {
					"sort": null
				}
			},
			{
				"cfg": {
					"title": "Urban footprint",
					"type": "extentoutline",
					"attrs": [],
					"featureLayer": "3664_#blank#",
					"featureLayerOpacity": "70",
					"classType": "quantiles",
					"numCategories": "5",
					"constrainFl": [
						0,
						3
					],
					"stacking": "none",
					"chartId": 9950252
				},
				"queryCfg": {}
			}
		]
	}
};

var ViewResolver = function(viewProps){
	var base = deepcopy(baseView);
	var conf = base["data"]["conf"];
	_.assign(conf,viewProps);
	this.view = base;
};

ViewResolver.prototype.create = function(){
	var self = this;
	return new Promise(function(resolve, reject){

		var req = request.post('/tool/rest/dataview', {data: self.view}, function (error, response, data) {

			if (data.success) {
				var createdViewKey = data.data._id;
				var viewUrl = "http://185.8.164.70/tool/?id=" + createdViewKey;
				resolve(viewUrl);
			}

		});

	});
};

module.exports = ViewResolver;