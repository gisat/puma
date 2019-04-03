let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let _ = require('underscore');
let Promise = require('promise');

let FilteredMongoThemes = require('../metadata/FilteredMongoThemes');
let MongoDataView = require('../visualization/MongoDataView');
let MongoTopic = require('../metadata/MongoTopic');
let MongoScope = require('../metadata/MongoScope');
let MongoLocation = require('../metadata/MongoLocation');

let PgGroups = require('./PgGroups');
let PgPermissions = require('./PgPermissions');
let PgWmsLayers = require('../layers/wms/PgWmsLayers');
let Permission = require('./Permission');

/**
 * This controller handles sharing as used inside of the FrontOffice. The user or group must get all relevant rights
 * towards related metadata concepts: scope, place, topic, wms layers
 */
class SharingController {
    constructor(app, pgPool, commonSchema, mongo) {
        app.post('/rest/share/user', this.shareToUser.bind(this));
        app.post('/rest/share/group', this.shareToGroup.bind(this));

        this.permissions = new PgPermissions(pgPool, commonSchema || config.postgreSqlSchema);
        this.groups = new PgGroups(pgPool, commonSchema || config.postgreSqlSchema);
        this.wmsLayers = new PgWmsLayers(pgPool, mongo, commonSchema || config.postgreSqlSchema);

        this.pgPool = pgPool;
        this.schema = commonSchema || config.postgreSqlSchema;
        this.mongo = mongo;
    }

    shareToUser(request, response) {
        let userId = Number(request.body.user);
        let dataViewId = Number(request.body.dataView);
        this.getMetadataToShare(Number(request.body.scope), request.body.places.map(place => Number(place))).then(metadata => {
            return Promise.all([
                this.permissions.add(userId, MongoScope.collectionName(), metadata.scope, Permission.READ),
                this.permissions.add(userId, MongoDataView.collectionName(), dataViewId, Permission.READ),
                this.permissions.addCollection(userId, MongoLocation.collectionName(), metadata.places, Permission.READ),
                this.permissions.addCollection(userId, MongoTopic.collectionName(), metadata.topics, Permission.READ),

                this.permissions.addCollection(userId, PgWmsLayers.tableName(), _.pluck(metadata.wmsLayers, 'id'), Permission.READ)
            ]);
        }).then(() => {
            response.json({
                status: 'ok'
            })
        }).catch(err => {
            logger.error(`SharingController#shareToUser Error: `, err);
            response.status(500).json({
                status: 'err',
                message: err
            })
        })
    }

    shareToGroup(request, response) {
        let groupId = Number(request.body.group);
        let dataViewId = Number(request.body.dataView);
        this.getMetadataToShare(Number(request.body.scope), request.body.places.map(place => Number(place))).then(metadata => {
            return Promise.all([
                this.permissions.addGroup(groupId, MongoScope.collectionName(), metadata.scope, Permission.READ),
                this.permissions.addGroup(groupId, MongoDataView.collectionName(), dataViewId, Permission.READ),
                this.permissions.addGroupCollection(groupId, MongoLocation.collectionName(), metadata.places, Permission.READ),
                this.permissions.addGroupCollection(groupId, MongoTopic.collectionName(), metadata.topics, Permission.READ),

                this.permissions.addGroupCollection(groupId, PgWmsLayers.tableName(), _.pluck(metadata.wmsLayers, 'id'), Permission.READ)
            ]);
        }).then(() => {
            response.json({
                status: 'ok'
            })
        }).catch(err => {
            logger.error(`SharingController#shareToUser Error: `, err);
            response.status(500).json({
                status: 'err',
                message: err
            })
        })
    }

    /**
     * It retrieves all metadata objects that respects Permissions.
     * @private
     * @param scope
     * @param places
     */
    getMetadataToShare(scope, places) {
        let topics = [];
        return new FilteredMongoThemes({}, this.mongo).json().then(themes => {
            topics = _.flatten(themes.map(theme => {
                return _.flatten([theme.topics, theme.prefTopics]);
            }));

            return this.wmsLayers.filtered(scope, places);
        }).then(wmsLayers => {
            return {
                scope: scope,
                places: places,
                topics: topics,
                wmsLayers: wmsLayers
            }
        });
    }
}

module.exports = SharingController;