const supertest = require('supertest');
const should = require('should');

const logger = require('../../../common/Logger').applicationWideLogger;

const IntegrationEnvironment = require('../IntegrationEnvironment');
const PucsMatlabProcessorController = require('../../../integration/PucsMatlabProcessorController');
const MongoScopes = require('../../../metadata/MongoScopes');

describe('Publish matlab results', () => {
	let integrationEnviroment;

	before((done) => {
		integrationEnviroment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			new PucsMatlabProcessorController(app, pool, schema.schema, mongoDb);
			new MongoScopes(mongoDb).add({
				"_id": 3971,
				"active": true,
				"createdBy": 1,
				"changedBy": 1,
				"name": "PUCS_test",
				"featureLayers": [3968],
				"years": [3969],
				"isMapIndependentOfPeriod": true,
				"viewSelection": "placeSelector",
				"hideSidebarReports": true,
				"showTimeline": false,
				"layersWidgetHiddenPanels": ["thematic-layers", "wms-layers"],
				"removedTools": ["2dmap", "areas", "selections", "snapshot", "contextHelp", "visualization", "scope", "theme", "place", "period", "visualization-always", "areasFilter", "customLayers"],
				"scenarios": true,
				"isMapDependentOnScenario": true,
				"configuration": {
					"pucsLandUseScenarios": {
						"templates": {
							"sourceVector": 3332,
							"sourceRaster": 4090,
							"uhi": 4091,
							"hwd": 4092
						}
					}
				}
			})
		}, {user: {id: 0}});

		integrationEnviroment
			.setup()
			.then(() => {
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	after((done) => {
		integrationEnviroment
			.tearDown()
			.then(() => {
				done();
			})
	});

	it('...', (done) => {
		let interval, execute = () => {
			supertest(integrationEnviroment.app)
				.post('/rest/pucs/publish')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send(
					{
						data: [
							{
								uuid: "s5f4s6df54sd6fdsfs6fs6d",
								data: {
									localLayer: `geonode:pucs_192351e289bf4c56a83fe700400771ae`,
									scope_id: 3971,
									place_id: 1,
									scenario_id: 1
								}
							}
						]
					}
				)
				.then((response) => {
					console.log(JSON.stringify(response.body));

					if (response.status === 200) {
						if (response.body.data) {
							let allDone = true;

							response.body.data.forEach((data) => {
								if (data.status === "running") {
									allDone = false;
								}
							});

							if (allDone) {
								clearInterval(interval);
								done();
							}
						}
					} else if (response.status === 500) {
						clearInterval(interval);
						done();
					}
				})
				.catch((error) => {
					done(error);
				});
		};

		interval = setInterval(() => {
			execute();
		}, 2000);

		execute();
	}).timeout(180000);
});

describe('Execute pucs matlab processor on local geoserver layer', () => {
	let integrationEnviroment;

	before((done) => {
		integrationEnviroment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			new PucsMatlabProcessorController(app, pool, schema.schema, mongoDb);
		}, {user: {id: 0}});

		integrationEnviroment
			.setup()
			.then(() => {
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	after((done) => {
		integrationEnviroment
			.tearDown()
			.then(() => {
				done();
			})
	});

	it('...', (done) => {
		let interval, execute = () => {
			supertest(integrationEnviroment.app)
				.post('/rest/pucs/execute_matlab')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({data: {localLayer: `geonode:pucs_192351e289bf4c56a83fe700400771ae`}})
				.then((response) => {
					console.log(response.body);

					if (response.status === 200) {
						if (response.body.result) {
							clearInterval(interval);
							done();
						}
					} else if (response.status === 500) {
						clearInterval(interval);
						done();
					}
				})
				.catch((error) => {
					done(error);
				});
		};

		interval = setInterval(() => {
			execute();
		}, 2000);

		execute();
	}).timeout(90000);
});

describe('Execute pucs matlab processor on remote geoserver layer', () => {
	let integrationEnviroment;

	before((done) => {
		integrationEnviroment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
			new PucsMatlabProcessorController(app, pool, schema.schema, mongoDb);
		}, {user: {id: 0}});

		integrationEnviroment
			.setup()
			.then(() => {
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	after((done) => {
		integrationEnviroment
			.tearDown()
			.then(() => {
				done();
			})
	});

	it('...', (done) => {
		let interval, execute = () => {
			supertest(integrationEnviroment.app)
				.post('/rest/pucs/execute_matlab')
				.set('Content-Type', 'application/json')
				.set('Accepts', 'application/json')
				.send({data: {remotePath: `http://localhost/geoserver/wfs?request=GetFeature&service=WFS&version=1.0.0&typeName=geonode:pucs_192351e289bf4c56a83fe700400771ae&outputFormat=SHAPE-ZIP`}})
				.then((response) => {
					console.log(response.body);

					if (response.status === 200) {
						if (response.body.result) {
							clearInterval(interval);
							done();
						}
					} else if (response.status === 500) {
						clearInterval(interval);
						done();
					}
				})
				.catch((error) => {
					done(error);
				});
		};

		interval = setInterval(() => {
			execute();
		}, 2000);

		execute();
	}).timeout(90000);
});

