var should = require('should');
var supertest = require('supertest-as-promised');
var conn = require('../../../common/conn');

var express = require('express');

var PgPool = require('../../../postgresql/PgPool');
var DatabaseSchema = require('../../../postgresql/DatabaseSchema');
var ImportedPlace = require('../../../integration/ImportedPlace');
var config = require('../config');

describe('ImportedPlace', function () {
	// TODO move to the create test server.
	var schema, pool;
	var commonSchema = 'data_test';
	var mongoDb;
	// Cleanse the database.
	before(function (done) {
		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		conn.connectToMongo(config.mongoConnString).then(function(db){
			mongoDb = db;

			schema = new DatabaseSchema(pool, commonSchema);
			return schema.create();
		}).then(function () {
			done();
		});
	});

	it('creates valid new tables', function(done) {
		new ImportedPlace(pool, 'gufde').create().then(() => {
			done();
		});
	});

	after(function (done) {
		// TODO: Clean the data in geoserver as well.

		schema.drop().then(function(){
			done();
		});
	});
});