let Promise = require('promise');
let express = require('express');

let conn = require('../../common/conn');

let PgPool = require('../../postgresql/PgPool');
let DatabaseSchema = require('../../postgresql/DatabaseSchema');
let config = require('./config');

let SymbologyToPostgreSqlMigration = require('../../migration/SymbologyToPostgreSql');
let CreateDefaultUserAndGroup = require('../../migration/CreateDefaultUserAndGroup');
let IdOfTheResourceMayBeText = require('../../migration/IdOfTheResourceMayBeText');
let PrepareForInternalUser = require('../../migration/PrepareForInternalUser');
let AddCustomInfoToWms = require('../../migration/AddCustomInfoToWms');

/**
 * Purpose of this class is to allow me to simply set up and tear down the environment for integration tests.
 */
class IntegrationEnvironment {
	/**
     * The method must return promise.
	 * @param onApplicationReady {Function}
	 * @param fixture {Object} containing relevant information for setting up for example the user.
	 */
	constructor(onApplicationReady, fixture) {
        this._onApplicationReady = onApplicationReady; // This function should create valid controllers.
        this._commonSchema = "data_test";
        this._fixture = fixture;

        this.app = null;
        this.pool = null;
        this.server = null;
    }

    /**
     * It connects to Mongo, PostgreSql, create new schema in PostgreSQL and prepare express application.
     * @return Promise
     */
    setup() {
        let app = this.app = express();
        app.use(express.bodyParser());
		app.use((request, response, next) => {
			request.session = {};
			request.session.userId = 1;
			request.session.user = this._fixture.user;
			next();
		});

        let pool = this.pool = new PgPool({
            user: config.pgDataUser,
            database: config.pgDataDatabase,
            password: config.pgDataPassword,
            host: config.pgDataHost,
            port: config.pgDataPort
        });

        return conn.connectToMongo(config.mongoConnString).then((db) => {
			this._mongoDb = db;

			this.schema = new DatabaseSchema(pool, this._commonSchema);
			return this.schema.drop();
		}).then(() => {
			return this.dropMongoCollections();
		}).then(() => {
            return this.schema.create();
        }).then(() => {
            return new SymbologyToPostgreSqlMigration(this._commonSchema).run();
        }).then(()=>{
            return new CreateDefaultUserAndGroup(this._commonSchema).run();
        }).then(()=>{
            return new IdOfTheResourceMayBeText(this._commonSchema).run();
        }).then(()=>{
            return new PrepareForInternalUser(this._commonSchema).run();
        }).then(()=>{
            return new AddCustomInfoToWms(this._commonSchema).run();
        }).then(() => {
            return this._onApplicationReady(app, pool, this.schema, this._mongoDb);
        }).then(() => {
        	return new Promise((resolve) => {
				this.server = app.listen(config.port, function () {
					resolve();
				});
			});
        });
    }

    /**
     * It tears down the environment. Remove the schema from PostgreSQL, cleanup collections in Mongo
     * TODO: Clean the created data from GeoServer as well.
     * @returns {Promise}
     */
    tearDown() {
        return this.schema.drop().then(() => {
        	this.server.close();

            return this.dropMongoCollections();
        })
    }

	/**
	 * It takes all the collections in the mongo and drops them.
	 * @returns {Promise.<*>}
	 */
	dropMongoCollections() {
		let collections = ['symbology', 'analysis', 'areatemplate', 'attribute', 'attributeset', 'chartcfg', 'dataset', 'dataview', 'layergroup', 'layerref', 'location', 'performedanalysis', 'settings', 'theme', 'topic', 'visualization', 'year'];

		return Promise.all(collections.map(collection => {
			return this._mongoDb.collection(collection).deleteMany({});
		}));
	}
}

module.exports = IntegrationEnvironment;