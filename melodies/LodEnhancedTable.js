// TODO: In longer term make this configurable. Preferably from BackOffice.
var PgGeometryRows = require('../data/PgGeometryRows');
var Promise = require('promise');
var LodAmenities = require('./LodAmenities');

class LodEnhancedTable {
    constructor(pgPool, schema, table) {
        this._pgPool = pgPool;
        this._schema = schema;
        this._table = table;

        // TODO: Configure id and geometry
        this._pgRows = new PgGeometryRows(schema, table, pgPool, 'the_geom', 'fid');
    }

    update() {
        this._pgRows.addColumn('schools_1km', 'double precision');
        this._pgRows.addColumn('schools_3km', 'double precision');
        this._pgRows.addColumn('schools_5km', 'double precision');

        this._pgRows.addColumn('hospitals_1km', 'double precision');
        this._pgRows.addColumn('hospitals_3km', 'double precision');
        this._pgRows.addColumn('hospitals_5km', 'double precision');

        this._pgRows.addColumn('public_transport_stops_1km', 'double precision');
        this._pgRows.addColumn('public_transport_stops_3km', 'double precision');
        this._pgRows.addColumn('public_transport_stops_5km', 'double precision');

        this._pgRows.addColumn('schools_nearest', 'double precision');
        this._pgRows.addColumn('hospitals_nearest', 'double precision');
        this._pgRows.addColumn('public_transport_stops_nearest', 'double precision');

        var rows = this._pgRows.all();
        var promises = [];
        rows.forEach(row => {
            promises.push(this.handleRow(row))
        });

        return Promise.all(promises);
    }

    handleRow(row) {
        return row.column('centroid').then(centroid => {
            return Promise.all([
                new LodAmenities('School', centroid, 1).json(),
                new LodAmenities('School', centroid, 3).json(),
                new LodAmenities('School', centroid, 5).json(),

                new LodAmenities('Hospital', centroid, 1).json(),
                new LodAmenities('Hospital', centroid, 3).json(),
                new LodAmenities('Hospital', centroid, 5).json(),

                new LodAmenities('StopPosition', centroid, 1).json(),
                new LodAmenities('StopPosition', centroid, 3).json(),
                new LodAmenities('StopPosition', centroid, 5).json()
            ]);
        }).then(results => {
            // Order to get shortest.
            results.forEach(result => {
                result.sort((a,b) => {
                    a.proximity.value > b.proximity.value
                });
            });


            return Promise.all([
                row.add('schools_1km', results[0].length),
                row.add('schools_3km', results[1].length),
                row.add('schools_5km', results[2].length),

                row.add('hospitals_1km', results[3].length),
                row.add('hospitals_3km', results[4].length),
                row.add('hospitals_5km', results[5].length),

                row.add('public_transport_stops_1km', results[6].length),
                row.add('public_transport_stops_3km', results[7].length),
                row.add('public_transport_stops_5km', results[8].length),

                // TODO: What if there is none found in given distance.
                row.add('schools_nearest', results[2][0].proximity.value),
                row.add('hospitals_nearest', results[5][0].proximity.value),
                row.add('public_transport_nearest', results[8][0].proximity.value)
            ]);
        });
    }
}

module.exports = LodEnhancedTable;