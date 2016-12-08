var Controller = require('./Controller');
var MongoLocations = require('../metadata/MongoLocations');
var MongoLocation = require('../metadata/MongoLocation');

class LocationController extends Controller {
    constructor(app) {
        super(app, 'location', MongoLocations, MongoLocation);
    }

    hasRights(user, method, id, object) {
        // How do you get the Scope.
        return user.hasPermission(this.type, method, id) && user.hasPermission('dataset', method, object.dataset);
    }
}

module.exports = LocationController;