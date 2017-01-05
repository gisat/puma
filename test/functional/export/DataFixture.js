let moment = require('moment');
let childProcess = require('pn/child_process');
let fs = require('pn/fs');
let config = require('../config');

class DataFixture {
	constructor(connection, pool, schema) {
		this.connection = connection;
		this.pool = pool;
		this.schema = schema;

		this.time = moment().format('YYYY-MM-DD HH:mm:ss');
		this.userId = 0;
	}

	setup() {
		let datasets = this.connection.collection('dataset');
		return datasets.insertMany([{
			"_id": 1,
			"active": true,
			"created": "2016-07-14T13:56:22.161Z",
			"createdBy": 2,
			"changed": "2016-07-14T13:57:01.859Z",
			"changedBy": 2,
			"name": "European countries",
			"featureLayers": [2, 3, 4, 5],
			"years": [6]
		}
		]).then(() => {
			let years = this.connection.collection('year');
			return years.insertMany([{
				"_id": 6,
				"name": "2012",
				"active": false,
				"created": "2016-07-14T13:56:56.831Z",
				"createdBy": 2,
				"changed": "2016-07-14T13:56:56.831Z",
				"changedBy": 2
			}])
		}).then(() => {
			let location = this.connection.collection('location');
			return location.insertMany([{
				"_id": 7,
				"active": true,
				"created": "2016-07-14T13:57:04.897Z",
				"createdBy": 2,
				"changed": "2016-07-21T09:44:50.371Z",
				"changedBy": 1,
				"name": "Czech republic",
				"bbox": "10.8765,48.5457,18.8635,51.0483",
				"dataset": 1
			}]);
		}).then(() => {
			let topic = this.connection.collection('topic');
			return topic.insertMany([{
				"_id": 9,
				"name": "Global Settlements Inventory",
				"active": false,
				"created": "2016-07-14T13:59:19.230Z",
				"createdBy": 2,
				"changed": "2016-07-14T13:59:19.230Z",
				"changedBy": 2
			}]);
		}).then(() => {
			let attributeSet = this.connection.collection('attributeset');
			return attributeSet.insertMany([
				{
					"_id": 12,
					"active": false,
					"created": "2016-07-14T14:00:04.504Z",
					"createdBy": 2,
					"changed": "2016-10-11T08:58:48.371Z",
					"changedBy": 1,
					"name": "Population",
					"attributes": [13],
					"featureLayers": [],
					"topic": 9
				},
				{
					"_id": 14,
					"active": false,
					"created": "2016-07-14T14:00:52.107Z",
					"createdBy": 2,
					"changed": "2016-10-17T14:47:30.778Z",
					"changedBy": 1,
					"name": "Urban Statistics",
					"attributes": [13, 15, 16, 17, 18, 19, 910],
					"featureLayers": [8],
					"topic": 9
				},
				{
					"_id": 31,
					"active": false,
					"created": "2016-07-14T14:11:14.066Z",
					"createdBy": 2,
					"changed": "2016-10-11T08:58:48.763Z",
					"changedBy": 1,
					"name": "Neighbours in 5km",
					"attributes": [16],
					"topic": 9,
					"featureLayers": []
				},
				{
					"_id": 32,
					"active": false,
					"created": "2016-07-14T14:12:02.267Z",
					"createdBy": 1,
					"changed": "2016-10-11T08:58:49.160Z",
					"changedBy": 1,
					"name": "Primary neighbours in 5 km",
					"attributes": [15],
					"featureLayers": [],
					"topic": 9
				},
				{
					"_id": 33,
					"active": false,
					"created": "2016-07-14T14:12:26.094Z",
					"createdBy": 1,
					"changed": "2016-10-11T08:58:49.371Z",
					"changedBy": 1,
					"name": "Secondary neighbours in 5km ",
					"attributes": [17],
					"featureLayers": [],
					"topic": 9
				},
				{
					"_id": 34,
					"active": false,
					"created": "2016-07-14T14:12:40.239Z",
					"createdBy": 1,
					"changed": "2016-10-11T08:58:49.580Z",
					"changedBy": 1,
					"name": "Local Betweeness",
					"attributes": [18],
					"featureLayers": [],
					"topic": 9
				},
				{
					"_id": 35,
					"active": false,
					"created": "2016-07-14T14:12:53.099Z",
					"createdBy": 1,
					"changed": "2016-10-11T08:58:49.786Z",
					"changedBy": 1,
					"name": "Nearest 3 neighbours distance",
					"attributes": [19],
					"featureLayers": [],
					"topic": 9
				},
				{
					"_id": 4030,
					"active": false,
					"created": "2016-10-17T13:45:54.781Z",
					"createdBy": 1,
					"changed": "2016-10-17T13:46:05.926Z",
					"changedBy": 1,
					"name": "Area",
					"attributes": [910],
					"featureLayers": [],
					"topic": 9
				},
				{
					"_id": 4185,
					"active": false,
					"created": "2016-10-19T08:09:16.750Z",
					"createdBy": 1,
					"changed": "2016-11-10T20:18:37.504Z",
					"changedBy": 1,
					"name": "GSI Statistics",
					"attributes": [13, 910, 4447],
					"featureLayers": [],
					"topic": 9
				}]);
		}).then(() => {
			let areaTemplate = this.connection.collection('areatemplate');
			return areaTemplate.insertMany([{
				"_id": 2,
				"name": "NUTS0",
				"layerType": "au",
				"active": false,
				"created": "2016-07-14T13:56:33.308Z",
				"createdBy": 2,
				"changed": "2016-07-14T13:56:33.308Z",
				"changedBy": 2
			}, {
				"_id": 3,
				"name": "NUTS1",
				"layerType": "au",
				"active": false,
				"created": "2016-07-14T13:56:38.502Z",
				"createdBy": 2,
				"changed": "2016-07-14T13:56:38.502Z",
				"changedBy": 2
			}, {
				"_id": 4,
				"name": "NUTS2",
				"layerType": "au",
				"active": false,
				"created": "2016-07-14T13:56:43.705Z",
				"createdBy": 2,
				"changed": "2016-07-14T13:56:43.705Z",
				"changedBy": 2
			}]);
		}).then(() => {
			let theme = this.connection.collection('theme');
			return theme.insertMany([{
				"_id": 11,
				"active": false,
				"created": "2016-07-14T13:59:45.479Z",
				"createdBy": 2,
				"changed": "2016-07-14T13:59:56.935Z",
				"changedBy": 2,
				"name": "Global Settlements Inventory",
				"years": [6],
				"topics": [9],
				"prefTopics": [],
				"dataset": 1
			}]);
		}).then(() => {
			let layerref = this.connection.collection('layerref');
			return layerref.insertMany([{
				"_id": 21,
				"layer": "geonode:cz",
				"location": 7,
				"year": 6,
				"active": true,
				"areaTemplate": 2,
				"columnMap": [],
				"isData": false,
				"fidColumn": "NUTS_ID",
				"nameColumn": "NUTS_NAME",
				"created": "2016-07-14T14:05:05.262Z",
				"createdBy": 2,
				"changed": "2016-07-14T14:05:05.262Z",
				"changedBy": 2
			},
				{
					"_id": 22,
					"layer": "geonode:cz",
					"location": 7,
					"year": 6,
					"columnMap": [{"attribute": 13, "column": "TOTAL_POP"}],
					"attributeSet": 12,
					"active": true,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"created": "2016-07-14T14:05:07.541Z",
					"createdBy": 2,
					"changed": "2016-07-14T14:05:07.541Z",
					"changedBy": 2
				},
				{
					"_id": 57,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 35,
					"columnMap": [{"column": "as_35_attr_19", "attribute": 19}],
					"layer": "analysis:an_54_2",
					"analysis": 54,
					"created": "2016-07-14T14:45:31.189Z",
					"createdBy": null,
					"changed": "2016-07-14T16:19:14.516Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 64,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 35,
					"columnMap": [{"column": "as_35_attr_19", "attribute": 19}],
					"layer": "analysis:an_61_2",
					"analysis": 61,
					"created": "2016-07-14T16:19:14.504Z",
					"createdBy": null,
					"changed": "2016-07-14T16:19:14.504Z",
					"changedBy": null
				},
				{
					"_id": 69,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 31,
					"columnMap": [{"column": "as_31_attr_16", "attribute": 16}],
					"layer": "analysis:an_66_2",
					"analysis": 66,
					"created": "2016-07-14T16:20:13.050Z",
					"createdBy": null,
					"changed": "2016-07-14T16:20:13.050Z",
					"changedBy": null
				},
				{
					"_id": 253,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 32,
					"columnMap": [{"column": "as_32_attr_15", "attribute": 15}],
					"layer": "analysis:an_250_2",
					"analysis": 250,
					"created": "2016-07-20T11:11:24.803Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:24.803Z",
					"changedBy": null
				},
				{
					"_id": 258,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 33,
					"columnMap": [{"column": "as_33_attr_17", "attribute": 17}],
					"layer": "analysis:an_255_2",
					"analysis": 255,
					"created": "2016-07-20T11:11:40.462Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:40.462Z",
					"changedBy": null
				},
				{
					"_id": 262,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 34,
					"columnMap": [{"column": "as_34_attr_18", "attribute": 18}],
					"layer": "analysis:an_259_2",
					"analysis": 259,
					"created": "2016-07-20T11:11:54.927Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:54.927Z",
					"changedBy": null
				},
				{
					"_id": 350,
					"active": true,
					"isData": false,
					"dataSourceOrigin": "geonode",
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"columnMap": [],
					"attributeSet": null,
					"layer": "geonode:cz",
					"location": 7,
					"areaTemplate": 2,
					"year": 319,
					"created": "2016-07-24T01:14:49.988Z",
					"createdBy": 1,
					"changed": "2016-07-24T01:14:49.988Z",
					"changedBy": 1
				},
				{
					"_id": 4050,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4047_2",
					"analysis": 4047,
					"created": "2016-10-17T14:24:06.482Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.179Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4102,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4083_2",
					"analysis": 4083,
					"created": "2016-10-17T14:50:42.941Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.216Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4132,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4119_2",
					"analysis": 4119,
					"created": "2016-10-17T15:11:46.387Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.249Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4153,
					"location": 7,
					"year": 6,
					"areaTemplate": 2,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4150_2",
					"analysis": 4150,
					"created": "2016-10-17T16:18:20.173Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.173Z",
					"changedBy": null
				},
				{
					"_id": 23,
					"layer": "geonode:cz1",
					"location": 7,
					"year": 6,
					"active": true,
					"areaTemplate": 3,
					"columnMap": [],
					"isData": false,
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"parentColumn": "PARID",
					"created": "2016-07-14T14:05:47.519Z",
					"createdBy": 2,
					"changed": "2016-07-14T14:05:47.519Z",
					"changedBy": 2
				},
				{
					"_id": 24,
					"layer": "geonode:cz1",
					"location": 7,
					"year": 6,
					"columnMap": [{"attribute": 13, "column": "TOTAL_POP"}],
					"attributeSet": 12,
					"active": true,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"parentColumn": "PARID",
					"created": "2016-07-14T14:05:47.757Z",
					"createdBy": 2,
					"changed": "2016-07-14T14:05:47.757Z",
					"changedBy": 2
				},
				{
					"_id": 56,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 35,
					"columnMap": [{"column": "as_35_attr_19", "attribute": 19}],
					"layer": "analysis:an_53_3",
					"analysis": 53,
					"created": "2016-07-14T14:45:18.319Z",
					"createdBy": null,
					"changed": "2016-07-14T16:19:14.475Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 63,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 35,
					"columnMap": [{"column": "as_35_attr_19", "attribute": 19}],
					"layer": "analysis:an_61_3",
					"analysis": 61,
					"created": "2016-07-14T16:19:14.461Z",
					"createdBy": null,
					"changed": "2016-07-14T16:19:14.461Z",
					"changedBy": null
				},
				{
					"_id": 68,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 31,
					"columnMap": [{"column": "as_31_attr_16", "attribute": 16}],
					"layer": "analysis:an_66_3",
					"analysis": 66,
					"created": "2016-07-14T16:20:13.022Z",
					"createdBy": null,
					"changed": "2016-07-14T16:20:13.022Z",
					"changedBy": null
				},
				{
					"_id": 252,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 32,
					"columnMap": [{"column": "as_32_attr_15", "attribute": 15}],
					"layer": "analysis:an_250_3",
					"analysis": 250,
					"created": "2016-07-20T11:11:24.775Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:24.775Z",
					"changedBy": null
				},
				{
					"_id": 257,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 33,
					"columnMap": [{"column": "as_33_attr_17", "attribute": 17}],
					"layer": "analysis:an_255_3",
					"analysis": 255,
					"created": "2016-07-20T11:11:40.441Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:40.441Z",
					"changedBy": null
				},
				{
					"_id": 261,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 34,
					"columnMap": [{"column": "as_34_attr_18", "attribute": 18}],
					"layer": "analysis:an_259_3",
					"analysis": 259,
					"created": "2016-07-20T11:11:54.907Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:54.907Z",
					"changedBy": null
				},
				{
					"_id": 356,
					"active": true,
					"isData": false,
					"dataSourceOrigin": "geonode",
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"parentColumn": "PARID",
					"columnMap": [],
					"attributeSet": null,
					"layer": "geonode:cz1",
					"location": 7,
					"areaTemplate": 3,
					"year": 319,
					"created": "2016-07-24T01:14:50.327Z",
					"createdBy": 1,
					"changed": "2016-07-24T01:14:50.327Z",
					"changedBy": 1
				},
				{
					"_id": 4049,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4047_3",
					"analysis": 4047,
					"created": "2016-10-17T14:24:06.414Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.010Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4096,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4083_3",
					"analysis": 4083,
					"created": "2016-10-17T14:50:42.680Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.058Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4126,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4119_3",
					"analysis": 4119,
					"created": "2016-10-17T15:11:46.026Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.096Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4152,
					"location": 7,
					"year": 6,
					"areaTemplate": 3,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4150_3",
					"analysis": 4150,
					"created": "2016-10-17T16:18:20.004Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:20.004Z",
					"changedBy": null
				},
				{
					"_id": 25,
					"layer": "geonode:cz2",
					"location": 7,
					"year": 6,
					"active": true,
					"areaTemplate": 4,
					"columnMap": [],
					"isData": false,
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"parentColumn": "PARID",
					"created": "2016-07-14T14:06:53.961Z",
					"createdBy": 2,
					"changed": "2016-07-14T14:06:53.961Z",
					"changedBy": 2
				},
				{
					"_id": 55,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 35,
					"columnMap": [{"column": "as_35_attr_19", "attribute": 19}],
					"layer": "analysis:an_52_4",
					"analysis": 52,
					"created": "2016-07-14T14:44:45.218Z",
					"createdBy": null,
					"changed": "2016-07-14T16:19:14.380Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 62,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 35,
					"columnMap": [{"column": "as_35_attr_19", "attribute": 19}],
					"layer": "analysis:an_61_4",
					"analysis": 61,
					"created": "2016-07-14T16:19:14.368Z",
					"createdBy": null,
					"changed": "2016-07-14T16:19:14.368Z",
					"changedBy": null
				},
				{
					"_id": 67,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 31,
					"columnMap": [{"column": "as_31_attr_16", "attribute": 16}],
					"layer": "analysis:an_66_4",
					"analysis": 66,
					"created": "2016-07-14T16:20:12.988Z",
					"createdBy": null,
					"changed": "2016-07-14T16:20:12.988Z",
					"changedBy": null
				},
				{
					"_id": 251,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 32,
					"columnMap": [{"column": "as_32_attr_15", "attribute": 15}],
					"layer": "analysis:an_250_4",
					"analysis": 250,
					"created": "2016-07-20T11:11:24.745Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:24.745Z",
					"changedBy": null
				},
				{
					"_id": 256,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 33,
					"columnMap": [{"column": "as_33_attr_17", "attribute": 17}],
					"layer": "analysis:an_255_4",
					"analysis": 255,
					"created": "2016-07-20T11:11:40.421Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:40.421Z",
					"changedBy": null
				},
				{
					"_id": 260,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 34,
					"columnMap": [{"column": "as_34_attr_18", "attribute": 18}],
					"layer": "analysis:an_259_4",
					"analysis": 259,
					"created": "2016-07-20T11:11:54.886Z",
					"createdBy": null,
					"changed": "2016-07-20T11:11:54.886Z",
					"changedBy": null
				},
				{
					"_id": 296,
					"layer": "geonode:cz2",
					"location": 7,
					"year": 6,
					"columnMap": [{"attribute": 13, "column": "TOTAL_POP"}],
					"attributeSet": 12,
					"active": true,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"parentColumn": "PARID",
					"created": "2016-07-21T08:10:23.803Z",
					"createdBy": 1,
					"changed": "2016-07-21T08:10:23.803Z",
					"changedBy": 1
				},
				{
					"_id": 362,
					"active": true,
					"isData": false,
					"dataSourceOrigin": "geonode",
					"fidColumn": "NUTS_ID",
					"nameColumn": "NUTS_NAME",
					"parentColumn": "PARID",
					"columnMap": [],
					"attributeSet": null,
					"layer": "geonode:cz2",
					"location": 7,
					"areaTemplate": 4,
					"year": 319,
					"created": "2016-07-24T01:14:50.599Z",
					"createdBy": 1,
					"changed": "2016-07-24T01:14:50.599Z",
					"changedBy": 1
				},
				{
					"_id": 4048,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4047_4",
					"analysis": 4047,
					"created": "2016-10-17T14:24:06.346Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:19.833Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4091,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4083_4",
					"analysis": 4083,
					"created": "2016-10-17T14:50:42.394Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:19.876Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4120,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4119_4",
					"analysis": 4119,
					"created": "2016-10-17T15:11:45.810Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:19.912Z",
					"changedBy": null,
					"active": false
				},
				{
					"_id": 4151,
					"location": 7,
					"year": 6,
					"areaTemplate": 4,
					"isData": true,
					"fidColumn": "gid",
					"attributeSet": 4030,
					"columnMap": [{"column": "as_4030_attr_910", "attribute": 910}],
					"layer": "analysis:an_4150_4",
					"analysis": 4150,
					"created": "2016-10-17T16:18:19.823Z",
					"createdBy": null,
					"changed": "2016-10-17T16:18:19.823Z",
					"changedBy": null
				}
			]);
		}).then(() => {
			let attribute = this.connection.collection('attribute');
			// I need to take into account the possibility for
			return attribute.insertMany([
				{
					"_id": 13,
					"name": "Total population",
					"active": false,
					"created": "2016-07-14T14:00:34.223Z",
					"createdBy": 2,
					"changed": "2016-07-25T14:53:28.522Z",
					"changedBy": 1,
					"type": "numeric",
					"standardUnits": null,
					"units": "inhabitants",
					"color": "#0000ff"
				},
				{
					"_id": 15,
					"name": "Primary Neighbours in 5km",
					"active": false,
					"created": "2016-07-14T14:01:19.944Z",
					"createdBy": 2,
					"changed": "2016-07-25T14:48:04.640Z",
					"changedBy": 1,
					"type": "numeric",
					"standardUnits": null,
					"color": "#ff0000"
				},
				{
					"_id": 16,
					"name": "Neighbours in 5km",
					"active": false,
					"created": "2016-07-14T14:01:47.119Z",
					"createdBy": 2,
					"changed": "2016-07-25T14:50:34.468Z",
					"changedBy": 1,
					"type": "numeric",
					"standardUnits": null,
					"color": "#00ff00"
				},
				{
					"_id": 17,
					"name": "Secondary neighbours in 5 km",
					"active": false,
					"created": "2016-07-14T14:02:12.874Z",
					"createdBy": 2,
					"changed": "2016-07-26T05:53:45.009Z",
					"changedBy": 2,
					"type": "numeric",
					"standardUnits": null,
					"color": "#0000ff"
				},
				{
					"_id": 18,
					"name": "Local betweeness",
					"active": false,
					"created": "2016-07-14T14:02:31.161Z",
					"createdBy": 2,
					"changed": "2016-07-26T05:53:56.036Z",
					"changedBy": 2,
					"type": "numeric",
					"standardUnits": null,
					"color": "#ffffff"
				},
				{
					"_id": 19,
					"name": "Nearest neighbors distances",
					"active": false,
					"created": "2016-07-14T14:03:10.071Z",
					"createdBy": 2,
					"changed": "2016-07-26T05:54:06.681Z",
					"changedBy": 2,
					"type": "numeric",
					"standardUnits": null,
					"color": "#aaaa00"
				},
				{
					"_id": 910,
					"name": "Area",
					"active": false,
					"created": "2016-07-27T11:45:52.087Z",
					"createdBy": 2,
					"changed": "2016-10-17T14:58:57.775Z",
					"changedBy": 1,
					"type": "numeric",
					"standardUnits": "m2",
					"color": "#aaaa00",
					"units": "m2"
				},
				{
					"_id": 4447,
					"active": false,
					"created": "2016-11-10T20:17:56.956Z",
					"createdBy": 1,
					"changed": "2016-11-10T20:18:15.476Z",
					"changedBy": 1,
					"name": "Density",
					"type": "numeric",
					"standardUnits": "",
					"units": "people / km2",
					"color": "#40bfb8"
				}
			]);
		}).then(() => {
			let performedAnalysis = this.connection.collection('attributeset');
			return performedAnalysis.insertMany([{
				"_id": 891,
				"analysis": 36,
				"location": 7,
				"year": 6,
				"featureLayerTemplates": [5],
				"dataset": 1,
				"created": "2016-07-25T07:03:15.665Z",
				"createdBy": null,
				"changed": "2016-07-25T07:03:45.322Z",
				"changedBy": 2,
				"uuid": "a6e1ddd0-4697-9230-4bd1-383a0690f744",
				"status": "Successful",
				"finished": "2016-07-25T07:03:45.318Z"
			},
				{
					"_id": 43,
					"analysis": 38,
					"location": 7,
					"year": 6,
					"featureLayerTemplates": [5],
					"dataset": 1,
					"created": "2016-07-14T14:38:31.767Z",
					"createdBy": null,
					"changed": "2016-07-14T14:38:54.654Z",
					"changedBy": 2,
					"uuid": "611a92bc-3390-9dde-9b4f-947327471053",
					"status": "Successful",
					"finished": "2016-07-14T14:38:54.651Z"
				},
				{
					"_id": 46,
					"analysis": 45,
					"location": 7,
					"year": 6,
					"featureLayerTemplates": [5],
					"dataset": 1,
					"created": "2016-07-14T14:40:01.462Z",
					"createdBy": null,
					"changed": "2016-07-14T14:40:24.836Z",
					"changedBy": 2,
					"uuid": "09b83ef7-4465-3b09-02d7-99c46cb2fa71",
					"status": "Successful",
					"finished": "2016-07-14T14:40:24.833Z"
				},
				{
					"_id": 59,
					"analysis": 47,
					"location": 7,
					"year": 6,
					"featureLayerTemplates": [5],
					"dataset": 1,
					"created": "2016-07-14T15:57:50.178Z",
					"createdBy": null,
					"changed": "2016-07-14T15:58:19.415Z",
					"changedBy": 2,
					"uuid": "1fb8fe4f-4d84-b04b-cf0a-2899c4100991",
					"status": "Successful",
					"finished": "2016-07-14T15:58:19.411Z"
				},
				{
					"_id": 4147,
					"analysis": 914,
					"location": 7,
					"year": 6,
					"featureLayerTemplates": [5],
					"dataset": 1,
					"created": "2016-10-17T16:13:50.317Z",
					"createdBy": null,
					"changed": "2016-10-17T16:14:06.884Z",
					"changedBy": 1,
					"id": "42156afa-38d6-5431-0864-0e2b0ae03137",
					"status": "Successful",
					"finished": "2016-10-17T16:14:06.879Z"
				}])
		}).then(() => {
			let analysis = this.connection.collection('analysis');
			return analysis.insertMany([
				{
					"_id": 36,
					"type": "spatialagg",
					"created": "2016-07-14T14:13:15.656Z",
					"createdBy": 1,
					"changed": "2016-07-14T14:15:11.114Z",
					"changedBy": 1,
					"name": "Nearest 3 distance",
					"areaTemplate": 8,
					"attributeSet": 35,
					"attributeMap": [{
						"attribute": 19,
						"attributeSet": 35,
						"calcAttribute": 19,
						"calcAttributeSet": 14,
						"groupVal": null,
						"normAttribute": null,
						"normAttributeSet": null,
						"type": "avgattrarea"
					}],
					"groupAttributeSet": null,
					"groupAttribute": null
				},
				{
					"_id": 38,
					"type": "spatialagg",
					"created": "2016-07-14T14:15:32.579Z",
					"createdBy": 1,
					"changed": "2016-07-14T14:17:26.529Z",
					"changedBy": 1,
					"name": "Neighbours in 5km",
					"areaTemplate": 8,
					"attributeSet": 31,
					"attributeMap": [{
						"attribute": 16,
						"attributeSet": 31,
						"calcAttribute": 16,
						"calcAttributeSet": 14,
						"groupVal": null,
						"normAttribute": null,
						"normAttributeSet": null,
						"type": "avgattrarea"
					}],
					"groupAttributeSet": null,
					"groupAttribute": null
				},
				{
					"_id": 45,
					"type": "spatialagg",
					"created": "2016-07-14T14:39:17.822Z",
					"createdBy": 2,
					"changed": "2016-07-14T14:39:48.007Z",
					"changedBy": 2,
					"name": "Primary neighbours in 5km",
					"areaTemplate": 8,
					"attributeSet": 32,
					"attributeMap": [{
						"attribute": 15,
						"attributeSet": 32,
						"calcAttribute": 15,
						"calcAttributeSet": 14,
						"groupVal": null,
						"normAttribute": null,
						"normAttributeSet": null,
						"type": "avgattrarea"
					}],
					"groupAttributeSet": null,
					"groupAttribute": null
				},
				{
					"_id": 47,
					"type": "spatialagg",
					"created": "2016-07-14T14:40:15.722Z",
					"createdBy": 2,
					"changed": "2016-07-14T14:40:40.358Z",
					"changedBy": 2,
					"name": "Secondary neighbours in 5 km",
					"areaTemplate": 8,
					"attributeSet": 33,
					"attributeMap": [{
						"attribute": 17,
						"attributeSet": 33,
						"calcAttribute": 17,
						"calcAttributeSet": 14,
						"groupVal": null,
						"normAttribute": null,
						"normAttributeSet": null,
						"type": "avgattrarea"
					}],
					"groupAttributeSet": null,
					"groupAttribute": null
				}
			]);
		}).then(() => {
			return this.pool.pool().query(``);
		}).then(() => {
			// Create additional tables.
		});
	}

	teardown() {
		let clean = this.cleanCollection.bind(this);
		return this.pool.pool().query(`DROP SCHEMA analysis`)
			.then(() => clean('analysis'))
			.then(() => clean('areatemplate'))
			.then(() => clean('attribute'))
			.then(() => clean('attributeset'))
			.then(() => clean('dataset'))
			.then(() => clean('layergroup'))
			.then(() => clean('layerref'))
			.then(() => clean('location'))
			.then(() => clean('performedanalysis'))
			.then(() => clean('theme'))
			.then(() => clean('topic'))
			.then(() => clean('year'));
	}

	cleanCollection(name) {
		return this.connection.collection(name).deleteMany({});
	}
}

module.exports = DataFixture;