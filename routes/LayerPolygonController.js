var PgGeometryToPoints = require('../data/PgGeometryToPoints');

class LayerPolygonController {
    constructor(app, pgPool) {
        // app.get('/export/geojson', this.geojson.bind(this));
        this._pgPool = pgPool;

        app.post('/rest/data/geometry/getPolygonPoints', this.getPolygonCooridnatesList.bind(this));
    }

    getPolygonCooridnatesList(request, response, next) {
        var options = request.body;
        new PgGeometryToPoints(options, this._pgPool).then(pointsArray => {
            var responseData = {
                data: {
                    points: pointsArray
                },
                success: true
            };
            if(!pointsArray) {
                responseData.success = false;
            }
            response.send(responseData);
        }).catch(error => {
            response.send({
                data: {},
                message: error,
                success: false
            });
        });
    }
}

module.exports = LayerPolygonController;