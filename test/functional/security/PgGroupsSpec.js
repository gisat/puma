let should = require('should');
let moment = require('moment');

let IntegrationEnvironment = require('../IntegrationEnvironment');
let logger = require('../../../common/Logger').applicationWideLogger;

let Permission = require('../../../security/Permission');
let PgGroups = require('../../../security/PgGroups');

describe('PgGroupsSpec', () => {
    let integrationEnvironment, fixture = {user: null};
    let pgGroups, pgPool, pgSchema, groupId = 6, toReadGroupId = 7;
    beforeEach(done => {
        integrationEnvironment = new IntegrationEnvironment((app, pool, schema, mongoDb) => {
            pgSchema = schema.schema;
            pgPool = pool;
            pgGroups = new PgGroups(pool, pgSchema);

            let time = moment().format('YYYY-MM-DD HH:mm:ss');
            // Create group to be updated.
            return pool.query(`
                INSERT INTO ${pgSchema}.groups (id, name, created, created_by, changed, changed_by) VALUES (${groupId}, 'test', '${time}', 1, '${time}', 1);
                
                INSERT INTO ${pgSchema}.panther_users (id, email, name) VALUES (10, 'jakub@balhar.net','Jakub Balhar');
                INSERT INTO ${pgSchema}.panther_users (id, email, name) VALUES (13, 'martin.babic@gisat.cz','Martin Babic');
                
                INSERT INTO ${pgSchema}.groups (id, name, created, created_by, changed, changed_by) VALUES (${toReadGroupId}, 'test1', '${time}', 1, '${time}', 1);
                
                INSERT INTO ${pgSchema}.permissions (user_id, resource_type, resource_id, permission) VALUES (1, 'group', '${toReadGroupId}', '${Permission.READ}');
                INSERT INTO ${pgSchema}.permissions (user_id, resource_type, resource_id, permission) VALUES (1, 'group', '${toReadGroupId}', '${Permission.UPDATE}');
                INSERT INTO ${pgSchema}.permissions (user_id, resource_type, resource_id, permission) VALUES (1, 'group', '${toReadGroupId}', '${Permission.DELETE}');
                
                INSERT INTO ${pgSchema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (1, 'group', '${toReadGroupId}', '${Permission.READ}');
                INSERT INTO ${pgSchema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (1, 'group', '${toReadGroupId}', '${Permission.UPDATE}');
                INSERT INTO ${pgSchema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (1, 'group', '${toReadGroupId}', '${Permission.DELETE}');
            `);
        }, fixture);
        integrationEnvironment.setup().then(() => {
            done();
        }).catch(error => {
            logger.error('PgGroupsSpec#beforeEach Error: ', error);
            done(error);
        })
    });

    describe('update', () => {
        it('returns resources with the information about everyone who has access rights. Multiple objects in collection', done => {
            pgGroups.update(groupId, {
                name: "New name",

                members: [10, 13],
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
                return pgPool.query(`Select * FROM ${pgSchema}.groups where id = ${groupId}`);
            }).then((result) => {
                should(result.rows[0].name).equal("New name");

                return pgPool.query(`SELECT * FROM ${pgSchema}.group_has_members WHERE group_id = ${groupId};`);
            }).then(result => {
                should(result.rows.length).equal(2);

                return pgPool.query(`SELECT * FROM ${pgSchema}.group_permissions WHERE group_id = ${groupId};`);
            }).then(result => {
                should(result.rows.length).equal(2); // Towards location and dataset

                return pgPool.query(`SELECT * FROM ${pgSchema}.permissions WHERE resource_type = 'group' AND resource_id = '${groupId}';`);
            }).then(result => {
                should(result.rows.length).equal(4);

                return pgPool.query(`SELECT * FROM ${pgSchema}.group_permissions WHERE resource_type = 'group' AND resource_id = '${groupId}';`);
            }).then(result => {
                should(result.rows.length).equal(4);

                done();
            }).catch(err => {
                done(err);
            });
        });
    });

    describe('json', () => {
        it('returns the information about the group enriched with permissions', done => {
            pgGroups.json().then(groups => {
                let group = groups.filter(group => {
                    return group._id === toReadGroupId;
                })[0];

                should(group.permissionsUsers.length).equal(3);
                should(group.permissionsGroups.length).equal(3);

                done()
            }).catch(err => {
                done(err);
            });
        })
    });

    describe('onlyExistingGroups', () => {
        it('returns only groups existing in the datastore', done => {
            pgGroups.onlyExistingGroups([{identifier: 'test'}, {identifier: 'notExistingGroup'}]).then(groups => {
                should(groups.length).equal(1);
                should(groups[0].identifier).equal('test');

                done();
            }).catch(err => {
                done(err);
            });
        })
    });

    afterEach(done => {
        integrationEnvironment.tearDown().then(() => {
            done();
        }).catch(error => {
            logger.error(`PgGroupsSpec#tearDown Error: `, error);
            done(error);
        });
    })
});