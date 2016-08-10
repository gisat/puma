var config = require('../config');

var Controller = require('./Controller');
var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');

var MongoClient = require('mongodb').MongoClient;
var Promise = require('promise');

class AreaTemplateController extends Controller {
	constructor(app) {
		super(app, 'areatemplate');
	}

	/**
	 * On top of standard update also update styles for all layers associated with this areaTemplate.
	 * @inheritDoc
	 */
	update(request, response, next) {
		var areaTemplate = request.body.data;
		var styles = areaTemplate.styles;
		var update = super.update;
		return MongoClient.connect(config.mongoConnString).then(function (database) {
			return new FilteredMongoLayerReferences({areatemplate: areaTemplate._id}, database).read();
		}).then(function(layerReferences){
			var promises = [];

			layerReferences.forEach(function(layerReference){
				promises.push(layerReference.layerName())
			});

			return Promise.all();
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
		});
	}
}

module.exports = AreaTemplateController;