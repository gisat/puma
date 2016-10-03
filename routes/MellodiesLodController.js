class MellodiesLodController {
    constructor(app) {
        app.get('/lod/mellodies/data', this.data.bind(this));
    }

    data(request, response, next) {
        // We need to define what types of data we will be able to return.
        var area = request.params.area;
        var type = request.params.type;

        response.json([{
            geom: 'POINT()',
            name: 'Test',
            area: '4500',
            type: 'Developed'
        }, {
            geom: 'POINT()',
            name: 'Test 2',
            area: '4000',
            type: 'Developed'
        }]);
    }
}

module.exports = MellodiesLodController;