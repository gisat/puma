let netcdf4 = require("netcdf4");
let shapefile = require("shapefile");
let geolib = require('geolib');
let moment = require('moment');

let file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2015_T2M.nc", "r");
let startTime = moment('2015-02-01T03:00:00.000Z');
let beginning = moment('2015-08-01T05:00:00.000Z');

let duration = moment.duration(beginning.diff(startTime));
let hours = duration.asHours();

let source, polygons = []; // PUCS_prague_LR_AOI_MC
// First read all the polygons.
shapefile.open('/data/Users/jbalhar/Projects/PUCS/Data/PUCS_prague_LR_AOI_MC.shp').then(pSource => {
    source = pSource;
    return source.read();
}).then(results => {
    return handleResults(results);
}).catch(err => {
    console.error(err);
});

function handleResults(results) {
    console.log(`Polygon: ${results.value}`);
    if(results.value) {
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
            times: [
            {hours: hours, label: '1.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 10, label: '1.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 20, label: '2.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 30, label: '2.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 40, label: '3.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 50, label: '3.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 60, label: '4.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 70, label: '4.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 80, label: '5.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 90, label: '5.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 100, label: '6.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 110, label: '6.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 120, label: '7.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 130, label: '7.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 140, label: '8.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 150, label: '8.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 160, label: '9.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 170, label: '9.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 180, label: '10.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 190, label: '10.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 200, label: '11.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 210, label: '11.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 220, label: '12.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 230, label: '12.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 240, label: '13.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 250, label: '13.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 260, label: '14.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 270, label: '14.5.2015 15:00', average: 0, total: 0},

            {hours: hours + 280, label: '15.5.2015 05:00', average: 0, total: 0},
            {hours: hours + 290, label: '15.5.2015 15:00', average: 0, total: 0}
        ]};
    });

    let results = handlePolygons(shapefilePolygons);

    results.forEach(result=>{
        console.log(`Id: ${result.id}`);
        result.times.forEach(time => {
            console.log(`Time: ${time.label}, Average: ${time.average / time.total}`);
        });
    })
}

// Times per polygon
function handlePolygons(polygons){
    let coords = file.root.dimensions['lat'].length;
    let points = 0;
    for(let lat = 0; lat < coords; lat++){
        for(let lon = 0; lon < coords; lon++) {
            console.log(`Coords: ${coords} Lat: ${lat} Lon: ${lon} `);

            points++;
            polygons.forEach(polygon => {
                if(geolib.isPointInside(
                    {latitude: file.root.variables['lat'].read(lat), longitude: file.root.variables['lon'].read(lon)},
                    polygon.coordinates
                )){
                    polygon.times.forEach(time => {
                        let result = file.root.variables['temperature'].read(time.hours, lon, lat);
                        time.total++;
                        time.average += result;
                    });
                }
            })
        }
    }

    return polygons;
}