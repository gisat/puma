let Controller = require('./Controller');
var MongoUniqueUpdate = require('../data/MongoUniqueUpdate');

let MongoVisualizations = require('../visualization/MongoVisualizations');
let MongoVisualization = require('../visualization/MongoVisualization');

class VisualizationController extends Controller {
	constructor(app, pool, mongoDb) {
		super(app, 'visualization', pool, MongoVisualizations, MongoVisualization);

		this._mongo = mongoDb;
		app.post('/rest/vis/saveorder', this.updateOrder.bind(this));
	}

	updateOrder(request, response, next){
		var theme = Number(request.body.theme);
		var visOrder = [];
		request.body.visOrder.map(vis => {
			visOrder.push(Number(vis));
		});
		this._mongo.collection('theme').update({_id: theme}, {$set: {visOrder: visOrder }}).then(function(res){
			response.send({
				status: "Ok"
			});
		});
	}
}

module.exports = VisualizationController;