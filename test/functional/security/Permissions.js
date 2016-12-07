let should = require('should');
let supertest = require('supertest-as-promised');
let conn = require('../../../common/conn');

let moment = require('moment');
let express = require('express');

let PgPool = require('../../../postgresql/PgPool');
let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let ScopeController = require('../../../routes/DataSetController');
let User = require('../../../security/User');
let Group = require('../../../security/Group');
let PgUsers = require('../../../security/PgUsers');
let PermissionFixture = require('./PermissionFixture');
let PgPermissions = require('../../../security/PgPermissions');

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
            next();
        });

        app.use((request, response, next) => {
            if(fixture.user) {
                request.session.user = fixture.user;
                return next();
            }

            if(request.session.userId) {
                let user;
                new PgUsers(pool, config.postgreSqlSchema).byId(request.session.userId).then(pUser => {
                    user = pUser;
                    return new PgPermissions(pool, config.postgreSqlSchema).forGroup(Group.guestId())
                }).then((permissions) => {
                    user.groups.push(new Group(Group.guestId(), permissions));
                    request.session.user = user;
                    next();
                });
            } else {
                new PgPermissions(pool, config.postgreSqlSchema).forGroup(Group.guestId()).then((permissions => {
                    request.session.user = new User(0, [], [new Group(Group.guestId(), permissions)]);
                }));
                next();
            }
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
            // Creat the fixture with scopes, locations and other necessary stuff.

            schema = new DatabaseSchema(pool, commonSchema);
            return schema.create();
        }).then(function () {
            return permissionFixture.setup();
        }).then(function(){
            done();
        }).catch((err) => {
            done(err);
        });

        new ScopeController(app, pool, commonSchema);
        server = app.listen(config.port, function () {
            console.log('Group app is listening\n');
        });
    });

    describe('as an administrator I see everything regardless of rights', function () {
        it('returns all', function (done) {
            fixture.user = new User(0, [], [new Group(1, [], 'admin')]);
            supertest(app)
                .get('/rest/dataset')
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .expect(200)
                .then(function (response) {
                    should(response.body.data.length).be.exactly(3);
                    done();
                }).catch(function (error) {
                done(error);
            });
        });
    });

    describe('as a guest I see only guest related stuff', function () {
        it('returns all', function (done) {
            fixture.user = null;
            supertest(app)
                .get('/rest/dataset')
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .expect(200)
                .then(function (response) {
                    should(response.body.data.length).be.exactly(1);
                    done();
                }).catch(function (error) {
                done(error);
            });
        });
    });

    afterEach(function (done) {
        schema.drop().then(function () {
            server.close();
            return permissionFixture.teardown();
        }).then(() => {
            done();
        }).catch((err) => {
            done(err);
        });
    });
});