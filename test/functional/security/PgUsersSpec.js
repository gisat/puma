let should = require('should');
let moment = require('moment');

let IntegrationEnvironment = require('../IntegrationEnvironment');
let logger = require('../../../common/Logger').applicationWideLogger;

let PgUsers = require('../../../security/PgUsers');
let Permission = require('../../../security/Permission');

describe('PgUsersSpec', () => {
    let integrationEnvironment, fixture = {user: null};
    let pgUsers, pgPool, pgSchema, userId = 6, toReadUserId = 7;
    beforeEach(done => {
        integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
            pgSchema = schema.schema;
            pgPool = pool;
            pgUsers = new PgUsers(pool, pgSchema);

            let time = moment().format('YYYY-MM-DD HH:mm:ss');
            // Create group to be updated.
            return pool.query(`
                INSERT INTO ${pgSchema}.panther_users (id, name, email, created, created_by, changed, changed_by) VALUES (${userId}, 'test1', 'someName', '${time}', 1, '${time}', 1);
                
                INSERT INTO ${pgSchema}.panther_users (id, name, email, created, created_by, changed, changed_by) VALUES (${toReadUserId}, 'test1', 'someMail', '${time}', 1, '${time}', 1);
                
                INSERT INTO ${pgSchema}.permissions (user_id, resource_type, resource_id, permission) VALUES (1, 'user', '${toReadUserId}', '${Permission.READ}');
                INSERT INTO ${pgSchema}.permissions (user_id, resource_type, resource_id, permission) VALUES (1, 'user', '${toReadUserId}', '${Permission.UPDATE}');
                INSERT INTO ${pgSchema}.permissions (user_id, resource_type, resource_id, permission) VALUES (1, 'user', '${toReadUserId}', '${Permission.DELETE}');
                
                INSERT INTO ${pgSchema}.permissions (user_id, resource_type, permission) VALUES (${toReadUserId}, 'dataset', '${Permission.CREATE}');
                
                INSERT INTO ${pgSchema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (1, 'user', '${toReadUserId}', '${Permission.READ}');
                INSERT INTO ${pgSchema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (1, 'user', '${toReadUserId}', '${Permission.UPDATE}');
                INSERT INTO ${pgSchema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (1, 'user', '${toReadUserId}', '${Permission.DELETE}');
            `);
        }, fixture);
        integrationEnvironment.setup().then(() => {
            done();
        }).catch(error => {
            logger.error('PgUsersSpec#beforeEach Error: ', error);
            done(error);
        })
    });

    describe('update', () => {
        it('returns resources with the information about everyone who has access rights. Multiple objects in collection', done => {
            pgUsers.update(userId, {
                name: "New name",
                password: "test",
                username: "jakub@balhar.net",

                permissions: ["location", "dataset"],

                users: {
                    read: [10],
                    update: [10, 13],
                    delete: [13]
                },

                groups: {
                    read: [10],
                    update: [10, 13],
                    delete: [13]
                }
            }, 1).then(() => {
                return pgPool.query(`Select * FROM ${pgSchema}.panther_users where id = ${userId}`);
            }).then((result) => {
                should(result.rows[0].name).equal("New name");
                should(result.rows[0].email).equal("jakub@balhar.net");

                return pgPool.query(`SELECT * FROM ${pgSchema}.permissions WHERE user_id = ${userId} AND resource_id is null;`);
            }).then(result => {
                should(result.rows.length).equal(2); // Towards location and dataset

                return pgPool.query(`SELECT * FROM ${pgSchema}.permissions WHERE resource_type = 'user' AND resource_id = '${userId}';`);
            }).then(result => {
                should(result.rows.length).equal(4);

                return pgPool.query(`SELECT * FROM ${pgSchema}.group_permissions WHERE resource_type = 'user' AND resource_id = '${userId}';`);
            }).then(result => {
                should(result.rows.length).equal(4);

                done();
            }).catch(err => {
                done(err);
            });
        });
    });

    describe('all', () => {
        it('returns the information about the group enriched with permissions', done => {
            pgUsers.all().then(users => {
                should(users.length).equal(2);
                let user = users.filter(user => {
                    return user.id === toReadUserId;
                })[0];

                should(user.permissionsUsers.length).equal(3);
                should(user.permissionsGroups.length).equal(3);
                should(user.permissionsTowards.length).equal(1);

                done()
            }).catch(err => {
                done(err);
            });
        })
    });

    afterEach(done => {
        integrationEnvironment.tearDown().then(() => {
            done();
        }).catch(error => {
            logger.error(`PgUsersSpec#tearDown Error: `, error);
            done(error);
        });
    })
});