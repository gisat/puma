var Controller = require('./Controller');
var MongoLayerGroups = require('../layers/MongoLayerGroups');
var MongoLayerGroup = require('../layers/MongoLayerGroup');

class LayerGroupController extends Controller {
	constructor(app) {
		super(app, 'layergroup', MongoLayerGroups, MongoLayerGroup);
	}
}

module.exports = LayerGroupController;