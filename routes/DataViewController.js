var Controller = require('./Controller');

// TODO: Finish removal of Data view.

class DataViewController extends Controller {
	constructor(app, pool) {
		super(app, 'dataview', pool);
	}
}

module.exports = DataViewController;