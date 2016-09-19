var should = require('should');

var config = require('../config');
var logger = require('../../../common/Logger').applicationWideLogger;

var MongoClient = require('mongodb').MongoClient;
var MongoLayerTemplate = require('../../../layers/MongoLayerTemplate');

describe('MongoLayerTemplate', function () {
	var db, collectionName = MongoLayerTemplate.collectionName();

	before(function (done) {
		MongoClient.connect(config.mongoConnString).then(function (client) {
			db = client;
			return client;
		}).then(function (client) {
			return client.collection(collectionName).insertOne(MongoLayerTemplate.example());
		}).then(function () {
			done();
		}).catch(function (error) {
			throw new Error(
				logger.error('MongoLayerTemplateSpec#before Error: ', error)
			);
		});
	});

	describe('#load', function () {
		var loaded;
		before(function (done) {
			new MongoLayerTemplate(MongoLayerTemplate.example()._id, db)
				.json()
				.then(
					function (jsonEntity) {
						loaded = jsonEntity;
						done();
					});
		});

		it('has correct id', function () {
			should(loaded._id).equal(1);
		});

		it('has correct name', function () {
			should(loaded.name).equal('GADM0');
		});

		it('has correct layer type', function () {
			should(loaded.layerType).equal('au');
		});
	});

	after(function (done) {
		db.collection(collectionName).deleteMany({}).then(function () {
			done();
		}).catch(function (error) {
			throw new Error(
				logger.error('MongoLayerTemplate#after Error: ', error)
			);
		});
	});
});