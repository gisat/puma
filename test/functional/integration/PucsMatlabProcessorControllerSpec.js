const supertest = require('supertest');
const should = require('should');

const logger = require('../../../common/Logger').applicationWideLogger;

const IntegrationEnvironment = require('../IntegrationEnvironment');
const PucsMatlabProcessorController = require('../../../integration/PucsMatlabProcessorController');

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
						if(response.body.result) {
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
						if(response.body.result) {
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

