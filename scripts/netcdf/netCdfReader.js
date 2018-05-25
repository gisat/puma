let netcdf4 = require("netcdf4");
let shapefile = require("shapefile");
let geolib = require('geolib');
let moment = require('moment');

let file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2015_T2M.nc", "r");
let startTime = moment('2015-02-01T03:00:00.000Z');
let beginning = moment('2015-08-01T05:00:00.000Z');

let duration = moment.duration(beginning.diff(startTime));
let hours = duration.asHours();

console.log(file.root.variables);
console.log(hours);
console.log(file.root.variables['temperature'].read(hours, 0, 0));

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
            id: polygon.properties["ID"],
            coordinates: polygon.geometry.coordinates[0].map(coordinate => {
                return {
                    latitude: coordinate[1],
                    longitude: coordinate[0]
                }
            }),
            times: [
            {hours: hours, label: 'c20150501t0500', average: 0, total: 0},
            {hours: hours + 10, label: 'c20150501t1500', average: 0, total: 0},

            {hours: hours + 24, label: 'c20150502t0500', average: 0, total: 0},
            {hours: hours + 34, label: 'c20150502t1500', average: 0, total: 0},

            {hours: hours + 48, label: 'c20150503t0500', average: 0, total: 0},
            {hours: hours + 58, label: 'c20150503t1500', average: 0, total: 0},

            {hours: hours + 72, label: 'c20150504t0500', average: 0, total: 0},
            {hours: hours + 82, label: 'c20150504t1500', average: 0, total: 0},

            {hours: hours + 96, label: 'c20150505t0500', average: 0, total: 0},
            {hours: hours + 106, label: 'c20150505t1500', average: 0, total: 0},

            {hours: hours + 120, label: 'c20150506t0500', average: 0, total: 0},
            {hours: hours + 130, label: 'c20150506t1500', average: 0, total: 0},

            {hours: hours + 144, label: 'c20150507t0500', average: 0, total: 0},
            {hours: hours + 154, label: 'c20150507t1500', average: 0, total: 0},

            {hours: hours + 168, label: 'c20150508t0500', average: 0, total: 0},
            {hours: hours + 178, label: 'c20150508t1500', average: 0, total: 0},

            {hours: hours + 192, label: 'c20150509t0500', average: 0, total: 0},
            {hours: hours + 202, label: 'c20150509t1500', average: 0, total: 0},

            {hours: hours + 216, label: 'c20150510t0500', average: 0, total: 0},
            {hours: hours + 226, label: 'c20150510t1500', average: 0, total: 0},

            {hours: hours + 240, label: 'c20150511t0500', average: 0, total: 0},
            {hours: hours + 250, label: 'c20150511t1500', average: 0, total: 0},

            {hours: hours + 264, label: 'c20150512t0500', average: 0, total: 0},
            {hours: hours + 274, label: 'c20150512t1500', average: 0, total: 0},

            {hours: hours + 288, label: 'c20150513t0500', average: 0, total: 0},
            {hours: hours + 298, label: 'c20150513t1500', average: 0, total: 0},

            {hours: hours + 332, label: 'c20150514t0500', average: 0, total: 0},
            {hours: hours + 342, label: 'c20150514t1500', average: 0, total: 0},

            {hours: hours + 356, label: 'c20150515t0500', average: 0, total: 0},
            {hours: hours + 366, label: 'c20150515t1500', average: 0, total: 0}
        ]};
    });

    let results = handlePolygons(shapefilePolygons);

    results.forEach(result=>{
        console.log(`UPDATE i4316_praha_mestske_casti SET`);
        result.times.forEach(time => {
            console.log(`,${time.label} = ${time.average / time.total}`);
        });
        console.log(`WHERE "ID" = ${result.id};`);
    })
}

// Times per polygon
function handlePolygons(polygons){
    let coords = file.root.dimensions['lat'].length;
    for(let lat = 0; lat < coords; lat++){
        for(let lon = 0; lon < coords; lon++) {
            console.log(`Coords: ${coords} Lat: ${lat} Lon: ${lon} `);

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