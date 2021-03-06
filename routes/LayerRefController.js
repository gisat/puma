let _ = require('underscore');

var config = require('../config');
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;
var Promise = require('promise');
var MongoClient = require('mongodb').MongoClient;

var Controller = require('./Controller');
var PgLayer = require('../layers/PgLayer');
var GeoServerLayers = require('../layers/GeoServerLayers');
var GeoServerLayerStyles = require('../layers/GeoServerLayerStyles');
var MongoLayerTemplate = require('../layers/MongoLayerTemplate');
var MongoLayerReferences = require('../layers/MongoLayerReferences');
var MongoLayerReference = require('../layers/MongoLayerReference');

let FilteredMongoLocations = require('../metadata/FilteredMongoLocations');
let FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');

let Permission = require('../security/Permission');

/**
 * @augments Controller
 */
class LayerRefController extends Controller {
	constructor(app, pgPool, mongo) {
		super(app, 'layerref', pgPool, MongoLayerReferences, MongoLayerReference);

		this.pgPool = pgPool;
		this.mongo = mongo;
	}

	readAll(request, response, next) {
        this._filteredReferences = new FilteredMongoLayerReferences({}, this.mongo);

        this._filteredReferences.json().then(layerRefs => {
            let resultsWithRights = layerRefs
                .filter(element => this.hasRights(request.session.user, Permission.READ, element._id, element))
                .map(layerRef => {
                    delete layerRef.created;
                    delete layerRef.createdBy;
                    delete layerRef.changed;
                    delete layerRef.changedBy;
                    return layerRef;
                });

            response.json({data: resultsWithRights});
        }).catch(err => {
            logger.error(`DataViewController#readInitialViews Error: `, err);
            response.status(500).json({
                status: "Err"
            })
        })
	}

    /**
	 * Styles are defined in the layer template, which means that we need to update them in the geoserver whenever the layer template changes for all associated layerrefs.
     *  Reasons to change stuff in geoserver
     *    New layer is mapped. It needs to associate all the styles relevant to the application. DONE
     *    New style is added to the template - It must add styles to all associated layerrefs.
	 * Make sure that there is new View, which contains all analytical units for the whole level.
     * @param request
	 * @param request.body {Object} Layerref object containing the data.
     * @param response
     * @param next
     */
	create(request, response, next) {
		var create = super.create.bind(this);
		var self = this;
		var layerRef = request.body.data;
		var layerType = layerRef.isData ? "vector": "raster";
		var pgLayer = new PgLayer(layerRef.layer, layerRef.fidColumn, layerType ,this.pgPool);
		return pgLayer.validate().then(function () {
			return self.updateStyles(layerRef)
		}).then(function () {
			return create(request, response, next);
		}).catch(function (error) {
			throw new Error(logger.error('LayerRefController#create Error: ', error));
		});
	}

	update(request, response, next) {
		var update = super.update.bind(this);
		var self = this;
		var layerRef = request.body.data;
		var layerType = layerRef.isData ? "vector": "raster";
		var pgLayer = new PgLayer(layerRef.layer, layerRef.fidColumn, layerType, this.pgPool);
		return pgLayer.validate().then(function(){
			return self.updateStyles(layerRef)
		}).then(function () {
			return update(request, response, next);
		}).catch(function (error) {
			throw new Error(logger.error('LayerRefController#update Error: ', error));
		});
	}

	/**
	 * @private
	 * @param request
	 * @returns {Promise.<TResult>}
	 */
	updateStyles(layerRef) {
		var layerName = layerRef.layer;
		var url = 'http://' + config.geoserverHost + ":" + config.geoserverPort + config.geoserverPath;
		var areaTemplate, styles, db;
		return MongoClient.connect(config.mongoConnString).then(function (database) {
			db = database;
			areaTemplate = new MongoLayerTemplate(layerRef.areaTemplate, database);
			return areaTemplate.styles();
		}).then(function (pStyles) {
			styles = pStyles || [];

			var promises = [];
			var geoServerLayerStyles = new GeoServerLayerStyles(url, config.geoserverUsername, config.geoserverPassword);
			styles.forEach(function (style) {
				promises.push(geoServerLayerStyles.create(layerName, style)); // It works because the id of the style is also a name of the style.
			});

			return Promise.all(promises);
		}).then(function(){
			db.close();
			return true;
		});
	}

    hasRights(user, method, id, object) {
        return user.hasPermission('location', method, object.location);
    }

    /**
	 * It gets relevant filter by loading all locations associated with the scope.
	 * @inheritDoc
     */
    getFilterByScope(scope) {
    	if(scope) {
            // Load Locations to use for filter.
            return new FilteredMongoLocations({dataset: scope}, this.mongo).json().then(locations => {
                return {
                    location: {$in: _.pluck(locations, "_id")}
                }
            });
        } else {
    		return Promise.resolve({});
		}
	}
}

module.exports = LayerRefController;