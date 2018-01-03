var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');

var Controller = require('./Controller');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var GeoServerLayerStyles = require('../layers/GeoServerLayerStyles');
var MongoLayerTemplate = require('../layers/MongoLayerTemplate');
var MongoLayerTemplates = require('../layers/MongoLayerTemplates');

var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');

class AreaTemplateController extends Controller {
	constructor(app, pool) {
		super(app, 'areatemplate', pool, MongoLayerTemplates, MongoLayerTemplate);
	}

	/**
	 * On top of standard update also update styles for all layers associated with this areaTemplate.
	 * @inheritDoc
	 */
	update(request, response, next) {
		var areaTemplate = request.body.data;
		var styles = areaTemplate.styles;
		var update = super.update.bind(this);
		return Promise.resolve(conn.getMongoDb()).then(function (connection) {
			return new FilteredMongoLayerReferences({areatemplate: areaTemplate._id}, connection).read();
		}).then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				promises.push(layerReference.layerName())
			});

			return Promise.all(promises);
		}).then(function(layerReferenceNames){
			var promises = [];
			var url = 'http://' + config.geoserverHost + ":" + config.geoserverPort + config.geoserverPath;
			var geoServerLayerStyles = new GeoServerLayerStyles(url, config.geoserverUsername, config.geoserverPassword);
			layerReferenceNames.forEach(function(layerReferenceName){
				styles.forEach(function(style){
					promises.push(geoServerLayerStyles.create(layerReferenceName, style)); // It works because the id of the style is also a name of the style.
				});
			});

			return Promise.all(promises);
		}).then(function(){
			update(request, response, next);
		}).catch(function(error){
			throw new Error(
				logger.error('AreaTemplateController#update Error: ', error)
			);
		});
	}

    hasRights(user, method, id, object) {
		if(object.layerType != 'raster' && object.layerType != 'vector') {
			return true;
		} else {
            return user.hasPermission('topic', method, object.topic);
		}
    }
}

module.exports = AreaTemplateController;