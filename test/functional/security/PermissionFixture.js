let moment = require('moment');

class PermissionFixture {
    constructor(connection, pool, schema) {
        this.connection = connection;
        this.pool = pool;
        this.schema = schema;
    }

    setup() {
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        let userId = 0;
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
            return location.insertMany([{
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
                    "dataset": 6
                },
                {
                    "_id": 13,
                    "active": true,
                    "created": "2016-11-30T12:43:25.773Z",
                    "createdBy": 1,
                    "changed": "2016-11-30T12:43:49.408Z",
                    "changedBy": 1,
                    "name": "iluminati Only jbalhar has access",
                    "bbox": "-101.82261629535324,41.2220772383181,-97.47303677095313,37.20885442564763",
                    "dataset": 7
                }]);
        }).then(() => {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.groups (name, created, created_by, changed, changed_by) VALUES ('admin', '${time}', ${userId}, '${time}', ${userId})`);
        }).then(() => {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.group_has_members (group_id, user_id, created, created_by, changed, changed_by) 
            VALUES (1, 0, '${time}', ${userId}, '${time}', ${userId})`);
        }).then(() => {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.groups (name, created, created_by, changed, changed_by) VALUES ('guest', '${time}', ${userId}, '${time}', ${userId})`);
        }).then(() => {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.groups (name, created, created_by, changed, changed_by) VALUES ('iluminati', '${time}', ${userId}, '${time}', ${userId})`);
        }).then(() => {
            return this.pool.pool().query(`INSERT INTO ${this.schema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (2, 'dataset', 1, 'GET')`);
        });
    }

    teardown() {
        return this.connection.dropDatabase();
    }
}

module.exports = PermissionFixture;