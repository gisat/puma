var Controller = require('./Controller');
var MongoLocations = require('../metadata/MongoLocations');
var MongoLocation = require('../metadata/MongoLocation');

class LocationController extends Controller {
    constructor(app, pool) {
        super(app, 'location', pool, MongoLocations, MongoLocation);
    }

    /**
     * Verify that the user has rights to create Locations.
     * @inheritDoc
     */
    create(request, response, next) {
        if (!request.session.user.hasPermission(this.type, 'POST', null)) {
            response.status(403);
            return;
        }

        super.create(request, response, next)
            .then(() => {
                next();
            });

    }

    hasRights(user, method, id, object) {
        // How do you get the Scope.
        return user.hasPermission(this.type, method, id) && user.hasPermission('dataset', method, object.dataset);
    }
}

module.exports = LocationController;