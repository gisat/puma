var MongoLayerGroups = require('../layers/MongoLayerGroups');
var MongoLayerGroup = require('../layers/MongoLayerGroup');
const FilteredMongoLayerTemplates = require('../layers/FilteredMongoLayerTemplates');
const LimitedReadAllController = require('./LimitedReadAllController');

class LayerGroupController extends LimitedReadAllController {
	constructor(app, pool) {
		super(app, 'layergroup', pool, MongoLayerGroups, MongoLayerGroup);
	}

	right(user, method, id){
		return new FilteredMongoLayerTemplates({layerGroup: {$in: [id]}}, this._connection).json().then(layerTemplates => {
			let permissions = false;

			layerTemplates.forEach(layerTemplate => {
				if(user.hasPermission('topic', method, layerTemplate.topic)){
					permissions = true;
				}
			});

			return permissions;
		});
	}
}

module.exports = LayerGroupController;