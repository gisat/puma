let netcdf4 = require("netcdf4");
let shapefile = require("shapefile");
let geolib = require('geolib');
let moment = require('moment');

let file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2015_T2M.nc", "r");
let startTime = moment('2015-02-01T03:00:00.000Z');
let beginning = moment('2015-03-01T05:00:00.000Z');

let duration = moment.duration(beginning.diff(startTime));
let hours = duration.asHours();

let source, polygons = []; // PUCS_prague_LR_AOI_MC
// First read all the polygons.
shapefile.open('/data/Users/jbalhar/Projects/PUCS/Data/PUCS_prague_LR_AOI_final.shp').then(pSource => {
    source = pSource;
    return source.read();
}).then(results => {
    return handleResults(results);
}).catch(err => {
    console.error(err);
});

function handleResults(results) {
    if(results.value) {
        console.log(`Polygon ${polygons.length}: `, results.value);
        polygons.push(results.value);
    }

    if(!results.done) {
        return source.read().then(handleResults);
    } else {
        processPolygons();
    }
}

function processPolygons() {
    let shapefilePolygons = polygons.map(polygon => {
        return {
            id: polygon.properties["Id"],
            coordinates: polygon.geometry.coordinates[0].map(coordinate => {
                return {
                    latitude: coordinate[1],
                    longitude: coordinate[0]
                }
            }),
            times: generateTimes()};
    });

    let results = handlePolygons(shapefilePolygons);

    results.forEach(result=>{
        let csv = ``, csvHeader = ``;
        result.times.forEach(time => {
            csvHeader += time.label + ',';
            csv += time.average / time.total+ ',';
        });

        csv = csvHeader + csv;
        console.log(csv);
    });
}

function generateTimes(){
    let hours = 2, result = [];
    for(let i = 0; i < 30; i++) {
        // Create new moment.
        hours += 10;
        result.push({hours: hours, label: startTime.add(hours, 'hours').format(), average: 0, total: 0});
        hours += 14;
        result.push({hours: hours, label: startTime.add(hours, 'hours').format(), average: 0, total: 0});
    }

    return result;
}

// Times per polygon
function handlePolygons(polygons){
    let coords = file.root.dimensions['lat'].length;
    for(let lat = 0; lat < coords; lat++){
        console.log(`Coords: ${coords} Lat: ${lat}`);

        for(let lon = 0; lon < coords; lon++) {
            polygons.forEach(polygon => {
                polygon.times.forEach(time => {
                    let result = file.root.variables['temperature'].read(time.hours, lon, lat);
                    time.total++;
                    time.average += result;
                });
            })
        }
    }

    return polygons;
}