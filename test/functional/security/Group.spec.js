let should = require('should');
let supertest = require('supertest-as-promised');
let conn = require('../../../common/conn');

let moment = require('moment');
let express = require('express');

let PgPool = require('../../../postgresql/PgPool');
let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let GroupController = require('../../../security/GroupController');
let User = require('../../../security/User');
let PgUsers = require('../../../security/PgUsers');

let config = require('../config');

describe('Group Logged In', function () {
    // TODO move to the create test server.
    let schema, pool, app;
    let commonSchema = 'data_test';
    let mongoDb;
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
            return schema.create();
        }).then(function () {
            done();
        });

        new GroupController(app, pool, commonSchema);
        server = app.listen(config.port, function () {
            console.log('Group app is listening\n');
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

    describe('add permission to the group', function () {
        it('adds valid permission', function (done) {
            fixture.user = new User(0, [{resourceType: 'group_permission', permission: 'POST', resourceId: 1}]);
            supertest(app)
                .post('/rest/permission/group')
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .send({groupId: 1, resourceType: 'group_permission', permission: 'POST', resourceId: 1})
                .expect(200)
                .then(function (response) {
                    should(response.body.status).be.exactly('Ok');

                    return pool.pool().query(`Select * from ${commonSchema}.group_permissions WHERE resource_type = 'group_permission' AND permission = 'POST' AND resource_id = '1'`);
                })
                .then(function (result) {
                    should(result.rows.length).be.aboveOrEqual(1);
                    done();
                }).catch(function (error) {
                done(error);
            });
        });
    });

    describe('remove permission from group', function () {
        it('removes valid permission when everything filled', function (done) {
            fixture.user = new User(0, [{resourceType: 'group_permission', permission: 'DELETE', resourceId: 1}]);

            pool.pool().query(`INSERT INTO ${commonSchema}.group_permissions (group_id, resource_type, permission, resource_id) 
                VALUES (1 , 'group', 'DELETE', '3')`).then(function () {
                supertest(app)
                    .delete('/rest/permission/group')
                    .set('Content-Type', 'application/json')
                    .set('Accepts', 'application/json')
                    .send({groupId: 1, resourceType: 'group', permission: 'POST', resourceId: 1})
                    .expect(200)
                    .then(function (response) {
                        should(response.body.status).be.exactly('Ok');

                        return pool.pool().query(`Select * from ${commonSchema}.group_permissions WHERE resource_type = 'group' AND permission = 'POST' AND resource_id = 3 AND group_id=1`);
                    })
                    .then(function (result) {
                        should(result.rows.length).be.exactly(0);
                        done();
                    }).catch(function (error) {
                    done(error);
                });
            })
        });

        it('removes valid permission when resource id isnt specified', function (done) {
            fixture.user = new User(0, [{resourceType: 'group_permission', permission: 'DELETE', resourceId: 1}]);

            pool.pool().query(`INSERT INTO ${commonSchema}.group_permissions (group_id, resource_type, permission, resource_id) 
                VALUES (1 , 'group', 'DELETE', '3')`).then(function () {
                supertest(app)
                    .delete('/rest/permission/group')
                    .set('Content-Type', 'application/json')
                    .set('Accepts', 'application/json')
                    .send({groupId: 1, resourceType: 'group', permission: 'POST'})
                    .expect(200)
                    .then(function (response) {
                        should(response.body.status).be.exactly('Ok');

                        return pool.pool().query(`Select * from ${commonSchema}.group_permissions WHERE resource_type = 'group' AND permission = 'POST' AND group_id=1`);
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

    describe('assign user to the group', function () {
        it('assigns user to the group', function (done) {
            fixture.user = new User(0, [{resourceType: 'group_member', permission: 'POST', resourceId: 1}]);
            supertest(app)
                .post('/rest/member/group')
                .set('Content-Type', 'application/json')
                .set('Accepts', 'application/json')
                .send({userId: 1, groupId: 1})
                .expect(200)
                .then(function (response) {
                    should(response.body.status).be.exactly('Ok');

                    return pool.pool().query(`Select * from ${commonSchema}.group_has_members WHERE user_id = 1 AND group_id = 1`);
                })
                .then(function (result) {
                    should(result.rows.length).be.aboveOrEqual(1);
                    done();
                }).catch(function (error) {
                done(error);
            });
        });
    });

    describe('remove user from the group', function () {
        it('remove user from group', function (done) {
            fixture.user = new User(0, [{resourceType: 'group_member', permission: 'DELETE', resourceId: 2}]);

            let time = moment().format('YYYY-MM-DD HH:mm:ss');
            pool.pool().query(`INSERT INTO ${commonSchema}.group_has_members (group_id, user_id, created, created_by, changed, changed_by) 
                VALUES (2 ,2, '${time}', 0, '${time}', 0)`).then(function () {
                supertest(app)
                    .delete('/rest/member/group')
                    .set('Content-Type', 'application/json')
                    .set('Accepts', 'application/json')
                    .send({userId: 2, groupId: 2})
                    .expect(200)
                    .then(function (response) {
                        should(response.body.status).be.exactly('Ok');

                        return pool.pool().query(`Select * from ${commonSchema}.group_has_members WHERE user_id = 2 AND group_id = 2`);
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

    afterEach(function (done) {
        schema.drop().then(function () {
            server.close();
            done();
        });
    });
});