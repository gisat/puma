var config = require('../config');
var logger = require('../common/Logger').applicationWideLogger;
var Controller = require('./Controller');
var GeoServerLayers = require('../layers/GeoServerLayers');
var GeoServerLayerStyles = require('../layers/GeoServerLayerStyles');
var MongoAreaTemplate = require('../layers/MongoAreaTemplate');
var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');

/**
 * @augments Controller
 */
class LayerRefController extends Controller {
	constructor(app) {
		super(app, 'layerref');
		this.layers = new GeoServerLayers();
	}

	// TODO: Update styles when there is also update in the area template for all associated layerrefs.
	// Styles are defined in the layer template, which means that we need to update them in the geoserver whenever the layer template changes for all associated layerrefs.
	// Reasons to change stuff in geoserver
	//   New layer is mapped. It needs to associate all the styles relevant to the application. DONE
	//   New style is added to the template - It must add styles to all associated layerrefs.
	create(request, response, next) {
		var create = super.create.bind(this);
		return this.updateStyles(request).then(function(){
			return create(request, response, next);
		}).catch(function(error){
			throw new Error(logger.error('LayerRefController#create Error: ', error));
		});
	}

	update(request, response, next) {
		var update = super.update.bind(this);
		return this.updateStyles(request).then(function(){
			return update(request, response, next);
		}).catch(function(error){
			throw new Error(logger.error('LayerRefController#update Error: ', error));
		});
	}

	/**
	 * @private
	 * @param request
	 * @returns {Promise.<TResult>}
	 */
	updateStyles(request) {
		var layerRef = request.body.data;
		var layerName = layerRef.layer;
		var url = 'http://' + config.geoserverHost + ":" + config.geoserverPort + config.geoserverPath;var areaTemplate, styles;
		return MongoClient.connect(config.mongoConnString).then(function(database){
			areaTemplate = new MongoAreaTemplate(layerRef.areaTemplate, database);
			return areaTemplate.styles();
		}).then(function(pStyles){
			styles = pStyles || [];

			var promises = [];
			var geoServerLayerStyles = new GeoServerLayerStyles(url, config.geoserverUsername, config.geoserverPassword);
			styles.forEach(function(style){
				promises.push(geoServerLayerStyles.create(layerName, style)); // It works because the id of the style is also a name of the style.
			});

			return Promise.all(promises);
		});
	}
}

module.exports = LayerRefController;