var Controller = require('./Controller');

// TODO: Finish deletion of the visualization

class VisualizationController extends Controller {
	constructor(app, pool) {
		super(app, 'visualization', pool);
	}
}

module.exports = VisualizationController;