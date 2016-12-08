let moment = require('moment');

class PermissionFixture {
    constructor(connection, pool, schema) {
        this.connection = connection;
        this.pool = pool;
        this.schema = schema;

        this.time = moment().format('YYYY-MM-DD HH:mm:ss');
        this.userId = 0;
    }

    setup() {
        let datasets = this.connection.collection('dataset');
        return datasets.insertMany([
            {
                "_id": 1,
                "active": true,
                "created": "2016-11-30T12:35:10.946Z",
                "createdBy": 1,
                "changed": "2016-11-30T12:35:46.826Z",
                "changedBy": 1,
                "name": "All have access",
                "featureLayers": [2, 3, 4],
                "years": [5]
            },
            {
                "_id": 6,
                "active": true,
                "created": "2016-11-30T12:35:50.389Z",
                "createdBy": 1,
                "changed": "2016-11-30T12:36:07.113Z",
                "changedBy": 1,
                "name": "Only jbalhar has access",
                "featureLayers": [2, 3, 4],
                "years": [5]
            },
            {
                "_id": 7,
                "active": true,
                "created": "2016-11-30T12:36:10.108Z",
                "createdBy": 1,
                "changed": "2016-11-30T12:36:29.508Z",
                "changedBy": 1,
                "name": "Only iluminati group has access",
                "featureLayers": [2, 3, 4],
                "years": [5]
            }]).then(() => {
            let years = this.connection.collection('year');
            return years.insertMany([{
                "_id": 5,
                "name": "2012",
                "active": false,
                "created": "2016-11-30T12:35:42.791Z",
                "createdBy": 1,
                "changed": "2016-11-30T12:35:42.791Z",
                "changedBy": 1
            }])
        }).then(() => {
            let location = this.connection.collection('location');
            return location.insertMany([
                {
                    "_id": 8,
                    "active": true,
                    "created": "2016-11-30T12:36:34.710Z",
                    "createdBy": 1,
                    "changed": "2016-11-30T12:37:00.188Z",
                    "changedBy": 1,
                    "name": "Keeps rights of scope",
                    "bbox": "-101.23887473195603,40.863494727689265,-91.63547899639822,38.31381239665047",
                    "dataset": 1
                },
                {
                    "_id": 9,
                    "active": true,
                    "created": "2016-11-30T12:37:03.054Z",
                    "createdBy": 1,
                    "changed": "2016-11-30T12:37:33.777Z",
                    "changedBy": 1,
                    "name": "Only iluminati has access",
                    "bbox": "-104.40163183590691,40.82151377985713,-95.51026307730405,34.62571293506653",
                    "dataset": 1
                },
                {
                    "_id": 10,
                    "active": true,
                    "created": "2016-11-30T12:37:37.262Z",
                    "createdBy": 1,
                    "changed": "2016-11-30T12:37:55.175Z",
                    "changedBy": 1,
                    "name": "Only jbalhar has access",
                    "bbox": "-102.21012150488816,39.924477686064684,-94.67794896518463,35.67459467103395",
                    "dataset": 1
                },
                {
                    "_id": 11,
                    "active": true,
                    "created": "2016-11-30T12:42:28.684Z",
                    "createdBy": 1,
                    "changed": "2016-11-30T12:42:46.649Z",
                    "changedBy": 1,
                    "name": "jbalhar Keep rights of scope",
                    "bbox": "-99.60403434299604,40.44961879276766,-96.76652492538354,37.64010649502802",
                    "dataset": 6
                },
                {
                    "_id": 12,
                    "active": true,
                    "created": "2016-11-30T12:42:49.835Z",
                    "createdBy": 1,
                    "changed": "2016-11-30T12:44:04.375Z",
                    "changedBy": 1,
                    "name": "iluminati Keep rights of scope",
                    "bbox": "-99.99588465788855,36.73719041611217,-105.97833473477472,39.07334879398723",
                    "dataset": 7
                },
                {
                    "_id": 13,
                    "active": true,
                    "created": "2016-11-30T12:43:25.773Z",
                    "createdBy": 1,
                    "changed": "2016-11-30T12:43:49.408Z",
                    "changedBy": 1,
                    "name": "iluminati Only iluminat has access",
                    "bbox": "-101.82261629535324,41.2220772383181,-97.47303677095313,37.20885442564763",
                    "dataset": 7
                }]);
        }).then(() => {
            return this.createGroup('admin');
        }).then(() => {
            return this.createGroup('guest');
        }).then(() => {
            return this.createGroup('iluminati');
        }).then(() => {
            return this.addMemberToGroup(this.adminId(), this.adminUserId());
        }).then(() => {
            return this.addMemberToGroup(this.iluminatiId(), this.iluminatUserId());
        }).then(() => {
            return this.addMemberToGroup(this.iluminatiId(), this.iluminat2UserId());
        }).then(() => {
            return this.addPermissionToGroup(this.guestId(), 'dataset', 'GET', 1);
        }).then(() => {
            return this.addPermissionToGroup(this.guestId(), 'location', 'GET', 8);
        }).then(() => {
            return this.addPermissionToGroup(this.iluminatiId(), 'dataset', 'GET', 7);
        }).then(() => {
            return this.addPermissionToGroup(this.iluminatiId(), 'location', 'GET', 9);
        }).then(() => {
            return this.addPermissionToGroup(this.iluminatiId(), 'location', 'GET', 12);
        }).then(() => {
            return this.addPermissionToUser(this.iluminatUserId(), 'location', 'GET', 13);
        }).then(() => {
            return this.addPermissionToUser(this.jbalharUserId(), 'dataset', 'GET', 6);
        }).then(() => {
            return this.addPermissionToUser(this.jbalharUserId(), 'location', 'GET', 10);
        }).then(() => {
            return this.addPermissionToUser(this.jbalharUserId(), 'location', 'GET', 11);
        });
    }

    adminId() {
        return 1;
    }

    guestId() {
        return 2;
    }

    iluminatiId() {
        return 3;
    }

    adminUserId() {
        return 1;
    }

    jbalharUserId() {
        return 2;
    }

    iluminatUserId() {
        return 3;
    }

    iluminat2UserId() {
        return 4;
    }

    async createGroup(name) {
        return this.pool.pool().query(`INSERT INTO ${this.schema}.groups (name, created, created_by, changed, changed_by) VALUES ('${name}', '${this.time}', ${this.userId}, '${this.time}', ${this.userId})`);
    }

    async addMemberToGroup(groupId, userId) {
        return this.pool.pool().query(`INSERT INTO ${this.schema}.group_has_members (group_id, user_id, created, created_by, changed, changed_by) 
            VALUES (${groupId}, ${userId}, '${this.time}', ${this.userId}, '${this.time}', ${this.userId})`);
    }

    async addPermissionToGroup(groupId, resourceType, permission, resourceId) {
        if (!resourceId) {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.group_permissions (group_id, resource_type, permission) VALUES (${groupId}, '${resourceType}', '${permission}')`);
        } else {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (${groupId}, '${resourceType}', ${resourceId}, '${permission}')`);
        }
    }

    async addPermissionToUser(userId, resourceType, permission, resourceId) {
        if (!resourceId) {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.permissions (user_id, resource_type, permission) VALUES (${userId}, '${resourceType}', '${permission}')`);
        } else {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.permissions (user_id, resource_type, resource_id, permission) VALUES (${userId}, '${resourceType}', ${resourceId}, '${permission}')`);
        }
    }

    teardown() {
        return this.connection.dropDatabase();
    }
}

module.exports = PermissionFixture;