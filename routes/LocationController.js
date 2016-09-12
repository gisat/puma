var Controller = require('./Controller');

class LocationController extends Controller {
	constructor(app) {
		super(app, 'location')
	}

	create(request, response, next) {
		var create = super.create.bind(this);
		create(request, response, next);
	}

	update(request, response, next) {
		var update = super.update.bind(this);
		update(request, response, next);
	}
}

module.exports = LocationController;