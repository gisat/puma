var Controller = require('./Controller');
var MongoLayerGroups = require('../layers/MongoLayerGroups');
var MongoLayerGroup = require('../layers/MongoLayerGroup');

class LayerGroupController extends Controller {
	constructor(app, pool) {
		super(app, 'layergroup', pool, MongoLayerGroups, MongoLayerGroup);
	}
}

module.exports = LayerGroupController;