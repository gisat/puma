var should = require('should');

var config = require('../config');
var logger = require('../../../common/Logger').applicationWideLogger;

var GeoServerWorkspaces = require('../../../layers/GeoServerWorkspaces');
var GeoServerWorkspace = require('../../../layers/GeoServerWorkspace');

describe('GeoServerWorkspace', function () {
	var url = 'http://' + config.geoserverHost + ":" + config.geoserverPort + config.geoserverPath;
	var workspaces;

	before(function () {
		workspaces = new GeoServerWorkspaces(url, config.geoserverUsername, config.geoserverPassword);
	});

	describe('#create and remove', function () {
		var created;
		before(function (done) {
			workspaces.create(GeoServerWorkspace.example()).then(function (entity) {
				created = entity;
				done();
			}).catch(function (error) {
				throw new Error(
					logger.error('GeoServerWorkspaceSpec#before Error: ', error)
				);
			});
		});

		it('should return 201', function () {
			should(created.status).equal(201);
		});

		after(function (done) {
			GeoServerWorkspace.example().name().then(function (name) {
				return workspaces.remove(name);
			}).then(function () {
				done();
			}).catch(function (error) {
				throw new Error(logger.error('GeoServerWorkspaceSpec#after Error: ', error))
			});
		});
	});
});