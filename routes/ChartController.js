var conn = require('../common/conn');
var FilteredBaseLayers = require('../layers/FilteredBaseLayers');

class ChartController {
    constructor(app, pool) {
        app.get('/rest/chart/table', pool, this.table.bind(this));
    }

    table(request, response, next) {
        // Filter using the Filtering. It returns only the information
        // I need to get attributeName from data.
        // Get the names associated with the attributes.
        // For each row.
    }
}

module.exports = ChartController;