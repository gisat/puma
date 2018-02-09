let should = require('should');
let supertest = require('supertest');
let conn = require('../../../common/conn');

let moment = require('moment');
let express = require('express');

let PgPool = require('../../../postgresql/PgPool');
let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let GroupController = require('../../../security/GroupController');
let User = require('../../../security/User');
let PgUsers = require('../../../security/PgUsers');
let PermissionFixture = require('./PermissionFixture');

let config = require('../config');

describe('Group Logged In', function () {
    // TODO move to the create test server.
    let schema, pool, app;
    let commonSchema = 'data_test';
    let mongoDb;
    let permissionFixture;
    let fixture = {user: null};
    let server;
    // Cleanse the database.
    beforeEach(function (done) {
        app = express();
        app.use(express.bodyParser());
        app.use((request, response, next) => {
            request.session = {};
            request.session.userId = 1;
            request.session.user = fixture.user;
            next();
        });

        pool = new PgPool({
            user: config.pgDataUser,
            database: config.pgDataDatabase,
            password: config.pgDataPassword,
            host: config.pgDataHost,
            port: config.pgDataPort
        });

        conn.connectToMongo(config.mongoConnString).then(function (db) {
            mongoDb = db;

            schema = new DatabaseSchema(pool, commonSchema);
            permissionFixture = new PermissionFixture(db, pool, commonSchema);
            return schema.create();
        }).then(function () {
            done();
        });

        new GroupController(app, pool, commonSchema);
        server = app.listen(config.port, function () {
            console.log('Group app is listening\n');
        });
    });

    describe('readAll', () => {
        beforeEach(done => {
            permissionFixture.setup().then(() => {
                done();
            });
        });

        it('returns all groups', done => {
            fixture.user = new User(0, [{
                resourceType: 'group',
                permission: 'GET',
                resourceId: 1
            }, {
                resourceType: 'group',
                permission: 'GET',
                resourceId: 2
            }, {
                resourceType: 'group',
                permission: 'GET',
                resourceId: 3
            }]);
            supertest(app)
                .get('/rest/group')
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .expect(200)
                .then((response) => {
                    should(Number(response.body.data.length)).be.exactly(3);
                    done();
                }).catch(err => {
                done(err);
            })
        });

        afterEach(done => {
            permissionFixture.teardown().then(() => {
                done();
            });
        });
    });

    describe('create', function () {
        it('should create valid group when user is logged in.', function (done) {
            fixture.user = new User(0, [{resourceType: 'group', permission: 'POST'}]);
            supertest(app)
                .post('/rest/group')
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .send({name: 'administration'})
                .expect(200)
                .then(function (response) {
                    should(response.body.status).be.exactly('Ok');

                    return pool.pool().query(`Select * from ${commonSchema}.groups WHERE name = 'administration'`);
                })
                .then(function (result) {
                    should(result.rows.length).be.aboveOrEqual(1);
                    done();
                }).catch(function (error) {
                done(error);
            });
        })
    });

    describe('delete', function () {
        it('should remove existing group', function (done) {
            fixture.user = new User(0, [{resourceType: 'group', permission: 'DELETE', resourceId: 1}]);

            let time = moment().format('YYYY-MM-DD HH:mm:ss');
            pool.pool().query(`INSERT INTO ${commonSchema}.groups (id, name, created, created_by, changed, changed_by) 
                VALUES (1, 'administrator', '${time}', 0, '${time}', 0)`).then(function () {
                supertest(app)
                    .delete('/rest/group/1')
                    .set('Content-Type', 'application/json')
                    .set('Accepts', 'application/json')
                    .expect(200)
                    .then(function (response) {
                        should(response.body.status).be.exactly('Ok');

                        return pool.pool().query(`Select * from ${commonSchema}.groups WHERE name = 'administrator'`);
                    })
                    .then(function (result) {
                        should(result.rows.length).be.exactly(0);
                        done()
                    }).catch(function (error) {
                    done(error);
                });
            })
        })
    });

    afterEach(function (done) {
        schema.drop().then(function () {
            server.close();
			pool.end();
            done();
        });
    });
});