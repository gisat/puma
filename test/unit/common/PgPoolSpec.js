var should = require('should');

var PgPool = require('../../../postgresql/PgPool');
var config = require('../config');

describe('PgPool', function(){
	describe('#connection', function(){
		it('returns valid connection.', function(done){
			var poolUnderTest = new PgPool({
				user: config.pgDataUser,
				database: config.pgDataDatabase,
				password: config.pgDataPassword,
				host: config.pgDataHost,
				port: config.pgDataPort
			});

			poolUnderTest.pool().connect().then(function(connection){
				should(connection).not.equal(null);
				done();
			}).catch(function(err){
				throw new Error(err);
			});
		});
	});
});