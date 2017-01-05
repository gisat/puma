let Promise = require('promise');
let express = require('express');

let conn = require('../../common/conn');

let PgPool = require('../../postgresql/PgPool');
let DatabaseSchema = require('../../postgresql/DatabaseSchema');
let config = require('./config');

/**
 * Purpose of this class is to allow me to simply set up and tear down the environment for integration tests.
 */
class IntegrationEnvironment {
    constructor(onApplicationReady) {
        this._onApplicationReady = onApplicationReady; // This function should create valid controllers.
        this._commonSchema = "data_test";
    }

    /**
     * It connects to Mongo, PostgreSql, create new schema in PostgreSQL and prepare express application.
     * @return Promise
     */
    setup() {
        let app = express();
        app.use(express.bodyParser());

        let pool = new PgPool({
            user: config.pgDataUser,
            database: config.pgDataDatabase,
            password: config.pgDataPassword,
            host: config.pgDataHost,
            port: config.pgDataPort
        });

        return conn.connectToMongo(config.mongoConnString).then((db) => {
            this._mongoDb = db;

            this.schema = new DatabaseSchema(pool, this._commonSchema);
            return this.schema.create();
        }).then(() => {
            this._onApplicationReady(app, pool, this.schema);
            return new Promise((resolve) => {
                app.listen(config.port, function () {
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
        let collections = ['symbology, analysis, areatemplate, attribute, attributeset, chartcfg, dataset, dataview, ' +
        'layergroup, layerref, location, performedanalysis, settings, theme, topic, visualization, year'];

        return this.schema.drop().then(() => {
            return Promise.all(collections.map(collection => {
                return this._mongoDb.collection(collection).deleteMany({});
            }));
        })
    }
}

module.exports = IntegrationEnvironment;