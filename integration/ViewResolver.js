var Promise = require('promise');
var logger = require('../common/Logger').applicationWideLogger;
var deepcopy = require('deepcopy');
var _ = require('underscore');
var request = require('request');

var config = require('../config');

// todo replace with correct data (correct scope, year, layers, visualization, etc.)
var baseView = {
	name: "",
	conf: {
		multipleMaps: false,
		years: [
			6460
		],
		dataset: 6291,
		theme: 6298,
		visualization: 6514,
		location: "6294_18",
		expanded: {
			6294: {
				6292: [
					"18"
				]
			}
		},
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
				opacity: 0.7,
				sortIndex: 2,
				type: "topiclayer",
				attributeSet: "",
				attribute: "",
				at: 6303,
				symbologyId: "#blank#"
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
				cfg: {
					title: "Urban Footprint",
					type: "piechart",
					attrs: [
						{
							as: 6455,
							attr: 6307,
							normType: "area",
							normAs: "",
							normAttr: "",
							normYear: "",
							attrNameNormalized: "",
							checked: true,
							numCategories: "",
							classType: "",
							zeroesAsNull: "",
							name: "",
							topic: "",
							parentId: null,
							index: 0,
							depth: 0,
							expanded: false,
							expandable: true,
							leaf: false,
							cls: "",
							iconCls: "",
							icon: "",
							root: false,
							isLast: false,
							isFirst: false,
							allowDrop: true,
							allowDrag: true,
							loaded: false,
							loading: false,
							href: "",
							hrefTarget: "",
							qtip: "",
							qtitle: "",
							children: null,
							attrName: "Urban areas",
							asName: "Global Urban Footprint Classes",
							treeNodeText: "Urban areas"
						},
						{
							as: 6455,
							attr: 6340,
							normType: "area",
							normAs: "",
							normAttr: "",
							normYear: "",
							attrNameNormalized: "",
							checked: true,
							numCategories: "",
							classType: "",
							zeroesAsNull: "",
							name: "",
							topic: "",
							parentId: null,
							index: 0,
							depth: 0,
							expanded: false,
							expandable: true,
							leaf: false,
							cls: "",
							iconCls: "",
							icon: "",
							root: false,
							isLast: false,
							isFirst: false,
							allowDrop: true,
							allowDrag: true,
							loaded: false,
							loading: false,
							href: "",
							hrefTarget: "",
							qtip: "",
							qtitle: "",
							children: null,
							attrName: "Not urbanized areas",
							asName: "Global Urban Footprint Classes",
							treeNodeText: "Not urbanized areas"
						}
					],
					featureLayerOpacity: "70",
					classType: "quantiles",
					numCategories: "5",
					constrainFl: [
						0,
						3
					],
					stacking: "none",
					chartId: 6353636
				},
				queryCfg: {
					invisibleAttrs: [],
					invisibleYears: []
				}
			},
			{
				cfg: {
					title: "Population density",
					type: "columnchart",
					attrs: [
						{
							as: 6465,
							attr: 6373,
							normType: "area",
							normAs: null,
							normAttr: null,
							normYear: "",
							attrNameNormalized: "",
							checked: true,
							numCategories: "",
							classType: "",
							zeroesAsNull: "",
							name: "",
							topic: "",
							parentId: null,
							index: 0,
							depth: 0,
							expanded: false,
							expandable: true,
							leaf: false,
							cls: "",
							iconCls: "",
							icon: "",
							root: false,
							isLast: false,
							isFirst: false,
							allowDrop: true,
							allowDrag: true,
							loaded: false,
							loading: false,
							href: "",
							hrefTarget: "",
							qtip: "",
							qtitle: "",
							children: null,
							attrName: "Population",
							asName: "Population",
							treeNodeText: "Population"
						}
					],
					featureLayerOpacity: "70",
					classType: "quantiles",
					numCategories: "5",
					constrainFl: [
						0,
						3
					],
					stacking: "none",
					chartId: 5731003
				},
				queryCfg: {
					invisibleAttrs: [],
					invisibleYears: []
				}
			}
		]
	}
};

var ViewResolver = function(viewProps){
	var base = deepcopy(baseView);
	var conf = base.conf;
	_.assign(conf,viewProps);
	this.view = base;
};

ViewResolver.prototype.create = function(){
	var self = this;
	return new Promise(function(resolve, reject){

		var req = request.post('/tool/rest/dataview', {data: self.view}, function (error, response, data) {

			if (
				data.success &&
				data.hasOwnProperty("data") &&
				data.data.hasOwnProperty("_id")
			) {
				var createdViewKey = data.data._id;
				//var viewUrl = "http://185.8.164.70/tool/?id=" + createdViewKey;
				var viewUrl = config.remoteProtocol + '://' + config.remoteAddress + "?id=" + createdViewKey;
				resolve(viewUrl);
			}

		});

	});
};

module.exports = ViewResolver;