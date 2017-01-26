let Controller = require('./Controller');

let MongoVisualizations = require('../visualization/MongoVisualizations');
let MongoVisualization = require('../visualization/MongoVisualization');
// TODO: Finish deletion of the visualization

class VisualizationController extends Controller {
	constructor(app, pool) {
		super(app, 'visualization', pool, MongoVisualizations, MongoVisualization);
	}
}

module.exports = VisualizationController;