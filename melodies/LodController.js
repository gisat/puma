var LodCreatedTable = require('./LodCreatedTable');
var LodEnhancedTable = require('./LodEnhancedTable');

class LodController {
    constructor(app, pgPool) {
        this._pgPool = pgPool;

        app.get('/wps/lod/update', this.update.bind(this));
        app.get('/wps/lod/create/place', this.create.bind(this));
    }

    update(request, response, next) {
        new LodEnhancedTable(this._pgPool, 'public', 'prague_ua2012', 'fid').update();

        response.json({status: 'OK'});
    }

    create(request, response, next) {
        new LodCreatedTable(this._pgPool, 'public', 'urban_atlas_2012', request.params.place).create();

        response.json({status: 'OK'});
    }
}

module.exports = LodController;