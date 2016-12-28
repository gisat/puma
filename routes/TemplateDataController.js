var Controller = require('./Controller');
var TemplateData = require('../data/TemplateData');
var Promise = require('promise');

class TemplateDataController extends Controller {
    constructor(app, pool) {
        super(app, 'templateData', TemplateData);

        app.post('/rest/data/templateData', this.data.bind(this));

        this._pool = pool;
    }

    data(request, response) {
        var template = request.body.template;
        var place = request.body.place;

        var templateData = new TemplateData(template, place, this._pool);
        templateData.getTemplateData().then(resolve => {
            response.status(resolve.success ? 200 : 500).send(resolve);
        });
    }
}

module.exports = TemplateDataController;