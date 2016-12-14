let should = require('should');
let supertest = require('supertest-as-promised');
let conn = require('../../../common/conn');

let moment = require('moment');
let express = require('express');

let PgPool = require('../../../postgresql/PgPool');
let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let UserController = require('../../../security/UserController');
let User = require('../../../security/User');
let PgUsers = require('../../../security/PgUsers');
let PermissionFixture = require('./PermissionFixture');

let config = require('../config');

describe('User', function () {
    // TODO move to the create test server.
    let schema, pool, app;
    let commonSchema = 'data_test';
    let mongoDb;
    let fixture = {user: null};
    let permissionFixture;
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

            permissionFixture = new PermissionFixture(db, pool, commonSchema);
            schema = new DatabaseSchema(pool, commonSchema);
            return schema.create();
        }).then(function () {
            done();
        });

        new UserController(app, pool, commonSchema);
        server = app.listen(config.port, function () {
            console.log('User app is listening\n');
        });
    });

    describe('add permission to the user', function () {
        it('adds valid permission', function (done) {
            fixture.user = new User(0, [{resourceType: 'permission', permission: 'POST', resourceId: 1}]);
            supertest(app)
                .post('/rest/permission/user')
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .send({userId: 1, resourceType: 'group_permission', permission: 'POST', resourceId: 1})
                .expect(200)
                .then(function (response) {
                    should(response.body.status).be.exactly('Ok');

                    return pool.pool().query(`Select * from ${commonSchema}.permissions WHERE resource_type = 'group_permission' AND permission = 'POST' AND resource_id = '1'`);
                })
                .then(function (result) {
                    should(result.rows.length).be.aboveOrEqual(1);
                    done();
                }).catch(function (error) {
                done(error);
            });
        });
    });

    describe('remove permission from user', function () {
        it('removes valid permission when everything filled', function (done) {
            fixture.user = new User(0, [{resourceType: 'permission', permission: 'DELETE', resourceId: 1}]);

            pool.pool().query(`INSERT INTO ${commonSchema}.permissions (user_id, resource_type, permission, resource_id) 
                VALUES (1 , 'group', 'DELETE', '3')`).then(function () {
                return supertest(app)
                    .delete('/rest/permission/user')
                    .set('Content-Type', 'application/json')
                    .set('Accepts', 'application/json')
                    .send({userId: 1, resourceType: 'group', permission: 'POST', resourceId: 1})
                    .expect(200)
            }).then(function (response) {
                should(response.body.status).be.exactly('Ok');

                return pool.pool().query(`Select * from ${commonSchema}.permissions WHERE resource_type = 'group' AND permission = 'POST' AND resource_id = '3' AND user_id=1`);
            }).then(function (result) {
                should(result.rows.length).be.exactly(0);
                done();
            }).catch(function (error) {
                done(error);
            });
        });

        it('removes valid permission when resource id isnt specified', function (done) {
            fixture.user = new User(0, [{resourceType: 'permission', permission: 'DELETE', resourceId: 1}]);

            pool.pool().query(`INSERT INTO ${commonSchema}.permissions (user_id, resource_type, permission, resource_id) 
                VALUES (1 , 'group', 'DELETE', '3')`).then(function () {
                supertest(app)
                    .delete('/rest/permission/user')
                    .set('Content-Type', 'application/json')
                    .set('Accepts', 'application/json')
                    .send({userId: 1, resourceType: 'group', permission: 'POST'})
                    .expect(200)
                    .then(function (response) {
                        should(response.body.status).be.exactly('Ok');

                        return pool.pool().query(`Select * from ${commonSchema}.permissions WHERE resource_type = 'group' AND permission = 'POST' AND user_id=1`);
                    })
                    .then(function (result) {
                        should(result.rows.length).be.exactly(0);
                        done();
                    }).catch(function (error) {
                    done(error);
                });
            })
        });
    });

    describe('load permissions for the user', () => {
        beforeEach(done => {
            permissionFixture.setup().then(() => {
                done();
            });
        });

        it('loads user by id', done => {
            fixture.user = new User(0, [{
                resourceType: 'user',
                permission: 'GET',
                resourceId: permissionFixture.jbalharUserId()
            }]);
            supertest(app)
                .get('/rest/user/' + permissionFixture.jbalharUserId())
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .expect(200)
            .then((response) => {
                should(Number(response.body.data._id)).be.exactly(2);
                should(response.body.data.permissions.length).be.exactly(4);
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

    describe('Load all users', function(){
        it('returns all users from Geonode enriched with permissions', function(done){
			fixture.user = new User(0, [{
				resourceType: 'user',
				permission: 'GET'
			}]);
			supertest(app)
                .get('/rest/user')
                .expect(200).then((response) => {
			    let users = response.body;
			    console.log(users);
			    done();
            });
		});
    });

    afterEach(function (done) {
        schema.drop().then(function () {
            server.close();
            done();
        });
    });
});