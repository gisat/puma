var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var deepcopy = require('deepcopy');
var _ = require('underscore');
var request = require('request');
var crud = require('../rest/crud');

var config = require('../config');

// todo replace with correct data (correct scope, year, layers, visualization, etc.)
var baseView = {
	name: "",
	conf: {
		multipleMaps: false,
		years: [
			6
		],
		dataset: 4309,
		theme: 4410,
		visualization: null,
		location: "6294_18",
		expanded: {},
		selMap: {
			ff4c39: []
		},
		choroplethCfg: [],
		pagingUseSelected: false,
		pagingSelectedColors: [
			"ff4c39",
			"34ea81",
			"39b0ff",
			"ffde58",
			"5c6d7e",
			"d97dff"
		],
		filterMap: {},
		filterActive: false,
		layers: [
			{
				opacity: 0.7,
				sortIndex: 0,
				type: "selectedareasfilled",
				attributeSet: "",
				attribute: "",
				at: "",
				symbologyId: ""
			},
			{
				opacity: 0.7,
				sortIndex: 1,
				type: "areaoutlines",
				attributeSet: "",
				attribute: "",
				at: "",
				symbologyId: ""
			},
			{
				opacity: 1,
				sortIndex: 10000,
				type: "terrain",
				attributeSet: "",
				attribute: "",
				at: "",
				symbologyId: ""
			}
		],
		trafficLayer: false,
		page: 1,
		mapCfg: {
			center: {
				lon: 1399875.3801206,
				lat: 5173645.4144647
			},
			zoom: 6
		},
		cfgs: [
			{
				"cfg": {
					"title": "Population vs. Urban area",
					"type": "scatterchart",
					"attrs": [
						{
							"as": 4310,
							"attr": 13,
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
							"topic": "",
							"parentId": null,
							"index": 0,
							"depth": 0,
							"expanded": false,
							"expandable": true,
							"leaf": false,
							"cls": "",
							"iconCls": "",
							"icon": "",
							"root": false,
							"isLast": false,
							"isFirst": false,
							"allowDrop": true,
							"allowDrag": true,
							"loaded": false,
							"loading": false,
							"href": "",
							"hrefTarget": "",
							"qtip": "",
							"qtitle": "",
							"children": null,
							"attrName": "Total population",
							"asName": "Global Urban Footprint",
							"treeNodeText": "Total population"
						},
						{
							"as": 4310,
							"attr": 4312,
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
							"topic": "",
							"parentId": null,
							"index": 0,
							"depth": 0,
							"expanded": false,
							"expandable": true,
							"leaf": false,
							"cls": "",
							"iconCls": "",
							"icon": "",
							"root": false,
							"isLast": false,
							"isFirst": false,
							"allowDrop": true,
							"allowDrag": true,
							"loaded": false,
							"loading": false,
							"href": "",
							"hrefTarget": "",
							"qtip": "",
							"qtitle": "",
							"children": null,
							"attrName": "Urban area",
							"asName": "Global Urban Footprint",
							"treeNodeText": "Urban area"
						}
					],
					"featureLayerOpacity": "70",
					"classType": "quantiles",
					"numCategories": "5",
					"constrainFl": [
						0,
						3
					],
					"stacking": "none",
					"chartId": 7165535
				},
				"queryCfg": {
					"invisibleAttrs": [],
					"invisibleYears": []
				}
			},
			{
				"cfg": {
					"title": "Urban / Non Urban area",
					"type": "columnchart",
					"attrs": [
						{
							"as": 4310,
							"attr": 4312,
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
							"topic": "",
							"parentId": null,
							"index": 0,
							"depth": 0,
							"expanded": false,
							"expandable": true,
							"leaf": false,
							"cls": "",
							"iconCls": "",
							"icon": "",
							"root": false,
							"isLast": false,
							"isFirst": false,
							"allowDrop": true,
							"allowDrag": true,
							"loaded": false,
							"loading": false,
							"href": "",
							"hrefTarget": "",
							"qtip": "",
							"qtitle": "",
							"children": null,
							"attrName": "Urban area",
							"asName": "Global Urban Footprint",
							"treeNodeText": "Urban area"
						},
						{
							"as": 4310,
							"attr": 4313,
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
							"topic": "",
							"parentId": null,
							"index": 0,
							"depth": 0,
							"expanded": false,
							"expandable": true,
							"leaf": false,
							"cls": "",
							"iconCls": "",
							"icon": "",
							"root": false,
							"isLast": false,
							"isFirst": false,
							"allowDrop": true,
							"allowDrag": true,
							"loaded": false,
							"loading": false,
							"href": "",
							"hrefTarget": "",
							"qtip": "",
							"qtitle": "",
							"children": null,
							"attrName": "Non Urban area",
							"asName": "Global Urban Footprint",
							"treeNodeText": "Non Urban area"
						}
					],
					"featureLayerOpacity": "70",
					"classType": "quantiles",
					"numCategories": "5",
					"constrainFl": [
						0,
						3
					],
					"stacking": "none",
					"chartId": 350894
				},
				"queryCfg": {
					"invisibleAttrs": [],
					"invisibleYears": []
				}
			}
		]
	}
};

var ViewResolver = function (viewProps) {
	var base = deepcopy(baseView);
	var conf = base.conf;
	_.extend(conf, viewProps);
	this.view = base;
};

ViewResolver.prototype.create = function () {
	var self = this;
	return new Promise(function (resolve, reject) {
		crud.create("dataview", self.view, {userId: 1}, function (err, result) {
			if (err) {
				throw new Error(
					logger.error("ViewResolver#create dataview. Error: ", err)
				);
			}

			var viewUrl = config.remoteProtocol + '://' + config.remoteAddress + "/?id=" + result._id;
			resolve(viewUrl);
		});
	});
};

module.exports = ViewResolver;