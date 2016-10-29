var Controller = require('./Controller');
var PlaceTemplates = require('../data/PlaceTemplates');
var Promise = require('promise');

class PlaceTemplatesController extends Controller {
    constructor(app) {
        super(app, 'placeTemplates', PlaceTemplates);

        app.post('/rest/data/placeTemplates', this.data.bind(this));
    }

    data(request, response) {
        var place = request.body.place;

        var placeTemplates = new PlaceTemplates(place);
        placeTemplates.getPlaceTemplates().then(placeTemplates => {
            response.send(placeTemplates);
        });
    }
}

module.exports = PlaceTemplatesController;