var Controller = require('./Controller');
var MongoLocations = require('../metadata/MongoLocations');
var MongoLocation = require('../metadata/MongoLocation');

class LocationController extends Controller {
	constructor(app) {
		super(app, 'location', MongoLocations, MongoLocation);
	}
}

module.exports = LocationController;