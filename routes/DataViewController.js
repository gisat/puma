var Controller = require('./Controller');

// TODO: Finish removal of Data view.

class DataViewController extends Controller {
	constructor(app) {
		super(app, 'dataview');
	}
}

module.exports = DataViewController;