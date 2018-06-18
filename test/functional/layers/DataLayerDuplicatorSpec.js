const supertest = require('supertest');
const should = require('should');
const expect = require('chai').expect;
const _ = require('lodash');

let logger = require('../../../common/Logger').applicationWideLogger;

let IntegrationEnvironment = require('../IntegrationEnvironment');

let DataLayerDuplicator = require('../../../layers/DataLayerDuplicator');

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
					if(!_.isObject(result) || !result.hasOwnProperty('contentType')) {
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
					if(!layerName.startsWith('panther_')) throw new Error('Duplication failed...');
					done();
				})
				.catch((error) => {
					console.log(error);
					done(error);
				})
		}).timeout(60000);
	});
});