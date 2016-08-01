var should = require('should');

var PgStyles = require('../../../styles/PgStyles');
var GeoserverStyles = require('../../../styles/GeoserverStyles');
var RestStyle = require('../../../styles/RestStyle');
var PgPool = require('../../../common/PgPool');
var UUID = require('../../../common/UUID');
var DatabaseSchema = require('../../../postgresql/DatabaseSchema');

var config = require('../config');

describe('GeoserverStyles', function(){
	var commonSchema = 'data';
	var schema, pool;
	var uuid = new UUID().toString();

	// Cleanse the database.
	before(function(done){
		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		schema = new DatabaseSchema(pool, commonSchema);
		schema.create().then(function(){
			done();
		});
	});

	describe('#add', function(){
		before(function(done){
			var styles = new PgStyles(pool, commonSchema);
			var restStyle = RestStyle.fixture(uuid);
			styles.add(restStyle).then(function() {
				done();
			});
		});

		it('saves the style', function(done){
			var styles = new GeoserverStyles(pool, commonSchema);

			styles.add(RestStyle.fixture(uuid)).then(function(results){
				should(results.status).equal(201);

				return styles.all();
			}).then(function(styles){
				var allPromises = [];
				var uuidFound = false;

				styles.forEach(style => {
					var promise = style.id();

					allPromises.push(promise);
					promise.then(function(uuidOfStyle){
						if(uuidOfStyle == uuid) {
							uuidFound = true;
							done();
						}
					});
				});

				Promise.all(allPromises).then(function(){
					should(uuidFound).equal(true);

					done();
				});
			}).catch(function(err){
				console.log(err);
			})
		});

		it('updates the style', function(done){
			var styles = new GeoserverStyles(pool, commonSchema);
			var styleToUpdate = RestStyle.fixture(uuid);
			styleToUpdate._definition.rules[0].name = "Test Urban";

			styles.update(styleToUpdate).then(function(){
				done();
			}).catch(function(err){
				console.log(err);
			})
		});
	});

	after(function(done){
		schema.drop().then(function(){
			done();
		});
	});
});