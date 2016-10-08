// TODO: In longer term make this configurable. Preferably from BackOffice.
var logger = require('../common/Logger').applicationWideLogger;
var moment = require('moment');

var PgGeometryRows = require('../data/PgGeometryRows');
var Promise = require('promise');
var LodAmenities = require('./LodAmenities');

class LodEnhancedTable {
    constructor(pgPool, schema, table, idColumn) {
        this._pgPool = pgPool;
        this._schema = schema;
        this._table = table;

        // TODO: Configure id and geometry
        this._pgRows = new PgGeometryRows(schema, table, pgPool, 'the_geom', idColumn);
        this._currentRow = 0;
        this._idColumn = idColumn;
    }

    update() {
        this._pgRows.addColumn('last_updated', 'double precision');

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

        return this._pgRows.all().then(rows => {
            return this.iterativeRow(rows);
        });
    }

    iterativeRow(rows) {
        if (this._currentRow < rows.length) {
            return this.handleRow(rows).then(() => {
                this._currentRow++;
                return this.iterativeRow(rows);
            }).catch(err => {
                logger.error(`LodEnhancedTable#iterativeRow Error: `, err);

                this._currentRow++;
                return this.iterativeRow(rows);
            });
        } else {
            return true;
        }
    }

    handleRow(rows) {
        var row = rows[this._currentRow];
        return row.id().then(id => {
            logger.info(`LodEnhancedTable#handleRow Load row with Id: ${id}.`);
            return row.column('current');
        }).then(date => {
            // Dont recache records younger than day.
            var now = moment().subtract(1, 'days');
            date = moment(date);
            if(date && date.isAfter(now)) {
                return true;
            }
            return row.centroid();
        }).then(centroid => {
            logger.info('LodEnhancedTable#handleRow loadAmenities.');
            return Promise.all([
                new LodAmenities('School', centroid, 5).json(),
                new LodAmenities('Hospital', centroid, 5).json(),
                new LodAmenities('StopPosition', centroid, 5).json()
            ]);
        }).then(results => {
            // Order to get shortest.
            results.forEach(result => {
                result.sort((a, b) => {
                    a.proximity.value > b.proximity.value
                });
            });

            var nearestSchool = results[0] && results[0][0] && results[0][0].proximity && results[0][0].proximity.value || 0;
            var nearestHospital = results[1] && results[1][0] && results[1][0].proximity && results[1][0].proximity.value || 0;
            var nearestPublicTransport = results[2] && results[2][0] && results[2][0].proximity && results[2][0].proximity.value || 0;

            var schoolsIn1Km = results[0].filter(result => result.proximity.value <= 1).length;
            var schoolsIn3Km = results[0].filter(result => result.proximity.value <= 3).length;

            var hospitalsIn1Km = results[1].filter(result => result.proximity.value <= 1).length;
            var hospitalsIn3Km = results[1].filter(result => result.proximity.value <= 3).length;

            var publicStopsIn1Km = results[2].filter(result => result.proximity.value <= 1).length;
            var publicStopsIn3Km = results[2].filter(result => result.proximity.value <= 3).length;

            logger.info(`LodEnhancedTable#handleRow save results. 5km: ${results[0].length} ${results[1].length} ${results[2].length} Nearest: ${nearestPublicTransport} ${nearestHospital} ${nearestSchool}`);

            return Promise.all([
                row.add('current', new Date().getTime()),

                row.add('schools_1km', schoolsIn1Km),
                row.add('schools_3km', schoolsIn3Km),
                row.add('schools_5km', results[0].length),

                row.add('hospitals_1km', hospitalsIn1Km),
                row.add('hospitals_3km', hospitalsIn3Km),
                row.add('hospitals_5km', results[1].length),

                row.add('public_transport_stops_1km', publicStopsIn1Km),
                row.add('public_transport_stops_3km', publicStopsIn3Km),
                row.add('public_transport_stops_5km', results[2].length),

                row.add('schools_nearest', nearestSchool),
                row.add('hospitals_nearest', nearestHospital),
                row.add('public_transport_stops_nearest', nearestPublicTransport)
            ]);
        });
    }
}

module
    .exports = LodEnhancedTable;