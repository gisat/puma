var should = require('should');
var Promise = require('promise');

var config = require('../config');
var logger = require('../../../common/Logger').applicationWideLogger;

var PgPool = require('../../../postgresql/PgPool');
var DatabaseSchema = require('../../../postgresql/DatabaseSchema');
var GeoServerWorkspaces = require('../../../layers/GeoServerWorkspaces');
var GeoServerWorkspace = require('../../../layers/GeoServerWorkspace');
var GeoServerDataStores = require('../../../layers/GeoServerDataStores');
var GeoServerDataStore = require('../../../layers/GeoServerDataStore');

describe('GeoServerDataStores', function () {
	var url = 'http://' + config.geoserverHost + ":" + config.geoserverPort + config.geoserverPath;
	var pool, schema, workspaces;
	var commonSchema = 'data_test';

	before(function (done) {
		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		schema = new DatabaseSchema(pool, commonSchema);
		return schema.create().then(function () {
			workspaces = new GeoServerWorkspaces(url, config.geoserverUsername, config.geoserverPassword);
			return workspaces.create(GeoServerWorkspace.example());
		}).then(function () {
			done();
		}).catch(function(error){
			throw new Error(
				logger.error('GeoServerDataStoresSpec#before Error: ', error)
			);
		});
	});

	describe('#create and remove', function () {
		var dataStores, created;
		var dataStore = GeoServerDataStore.example(config.pgDataHost, config.pgDataPort, config.pgDataDatabase, config.pgDataUser, config.pgDataPassword);
		before(function (done) {
			dataStores = new GeoServerDataStores(url, config.geoserverUsername, config.geoserverPassword);
			dataStores.create(dataStore).then(function(result){
				created = result;
				done();
			}).catch(function(error){
				throw new Error(
					logger.error('GeoServerDataStoresSpec#createAndRemove Error: ', error)
				)
			});
		});

		it('returned 201', function(){
			should(created.status).equal(201);
		});

		after(function (done) {
			Promise.all([GeoServerWorkspace.example().name(), dataStore.name()]).then(function(results){
				return dataStores.remove(results[0], results[1]);
			}).then(function(){
				done();
			}).catch(function(error){
				throw new Error(
					logger.error('GeoServerDataStoresSpec#after Error: ', error)
				)
			})
		});
	});

	after(function (done) {
		schema.drop().then(function () {
			return GeoServerWorkspace.example().name();
		}).then(function(name){
			return workspaces.remove(name);
		}).then(function(){
			done();
		}).catch(function(){
			throw new Error(
				logger.error('GeoServerDataStoresSpec#after Error: ', error)
			)
		});
	});
});