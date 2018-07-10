const supertest = require('supertest');
const should = require('should');
const expect = require('chai').expect;
const _ = require('lodash');
const express = require('express');

const config = require('../config');

const logger = require('../../../common/Logger').applicationWideLogger;

const IntegrationEnvironment = require('../IntegrationEnvironment');

const DataLayerDuplicator = require('../../../layers/DataLayerDuplicator');
const LayerImporterController = require('../../../integration/LayerImporterController');

describe('DataLayerDuplicator', () => {
	let dataLayerDuplicator = new DataLayerDuplicator();

	describe('Get system friendly name', () => {
		it('...', (done) => {
			dataLayerDuplicator.getSystemFriendlyName()
				.then((name) => {
					console.log(`#### name`, name);
					done();
				})
		});
	});

	describe('Download ziped shape file from geoserver', () => {
		it('...', (done) => {
			dataLayerDuplicator.getGeoserverShapeLayerDownloadUrlByLayerName(`geonode:pucs_192351e289bf4c56a83fe700400771ae`)
				.then((url) => {
					return dataLayerDuplicator.downloadFileFromRemote(url);
				})
				.then((result) => {
					if (!_.isObject(result) || !result.hasOwnProperty('contentType')) {
						throw new Error('Expected object with contentType key');
					} else {
						done();
					}
				})
				.catch((error) => {
					done(error);
				})
		}).timeout(60000)
	});

	describe('Duplicate geoserver layer', () => {
		it('...', (done) => {
			dataLayerDuplicator.duplicateGeoserverLayer('geonode:pucs_192351e289bf4c56a83fe700400771ae')
				.then((layerName) => {
					if (!layerName.startsWith('panther_')) throw new Error('Duplication failed...');
					done();
				})
				.catch((error) => {
					console.log(error);
					done(error);
				})
		}).timeout(60000);
	});

	describe('Duplicate geoserver layer using rest', () => {
		let integrationEnviroment;

		before((done) => {
			integrationEnviroment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
				new LayerImporterController(app, mongoDb, pool, schema.schema, config.pantherDataStoragePath);
			}, {user: null});

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

		it('Duplicate layer...', (done) => {
			let interval, request = () => {
				supertest(integrationEnviroment.app)
					.post('/rest/importer/duplicate')
					.set('Content-Type', 'application/json')
					.set('Accepts', 'application/json')
					.send(
						{
							data: [
								{
									uuid: "sd51f65s1fs61fs",
									data: {
										layerName: "geonode:pucs_192351e289bf4c56a83fe700400771ae"
									}
								}
							]
						}
					)
					.then((response) => {
						console.log(JSON.stringify(response.body));

						let running = false;
						response.body.data.forEach((data) => {
							if (data.status === 'running') {
								running = true;
							}
						});

						if (!running) {
							clearInterval(interval);
							done();
						}
					})
					.catch((error) => {
						clearInterval(interval);
						done(error);
					});
			};

			interval = setInterval(() => {
				request();
			}, 2000);

			request();
		}).timeout(120000);
	});
});