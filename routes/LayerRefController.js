var config = require('../config');
var Controller = require('./Controller');
var GeoServerLayers = require('../layers/GeoServerLayers');
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

	create(request, response, next) {
		return this.updateStyles(request).then(function(){
			return super.create(request, response, next);
		});
	}

	update(request, response, next) {
		return this.updateStyles(request).then(function(){
			return super.update(request, response, next);
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
			styles = pStyles;

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