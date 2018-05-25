let results = [];

function handleOneFile(file, year) {
    let coords = file.root.dimensions['lat'].length;
    let hours = file.root.dimensions['time'].length;

    let min = Number.MAX_SAFE_INTEGER, minHours = 0, max = Number.MIN_SAFE_INTEGER, maxHours = 0, temp, temperatures;
    for (let lat = 0; lat < coords; lat++) {
        for (let lon = 0; lon < coords; lon++) {
            console.log(`Year: ${year} Lat: ${lat} Lon: ${lon}`);
            temperatures = file.root.variables['temperature'].readSlice(0, hours, lon, 1, lat, 1);
            for (let t = 0; t < hours; t++) {
                temp = temperatures[t];
                if (temp > max) {
                    max = temp;
                    maxHours = t;
                }

                if (temp < min) {
                    min = temp;
                    minHours = t;
                }
            }
        }
    }

    results.push({
        year: year,
        min: min,
        minHours: minHours,
        max: max,
        maxHours: maxHours
    });
    console.log(`Result ${year}: Min: ${min} Hours: ${minHours} Max: ${max} Hours: ${maxHours}`);
}

let netcdf4 = require("netcdf4");
let file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2007_T2M.nc", "r");
handleOneFile(file, '2007');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2008_T2M.nc", "r");
handleOneFile(file, '2008');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2009_T2M.nc", "r");
handleOneFile(file, '2009');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2010_T2M.nc", "r");
handleOneFile(file, '2010');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2011_T2M.nc", "r");
handleOneFile(file, '2011');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2012_T2M.nc", "r");
handleOneFile(file, '2012');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2013_T2M.nc", "r");
handleOneFile(file, '2013');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2014_T2M.nc", "r");
handleOneFile(file, '2014');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2014_T2M.nc", "r");
handleOneFile(file, '2014');

file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2016_T2M.nc", "r");
handleOneFile(file, '2016');

let minTotal = Number.MAX_SAFE_INTEGER, minYear = 0, minHours = 0, maxTotal = Number.MIN_SAFE_INTEGER, maxYear = 0, maxHours = 0;
for (let i = 0; i < results.length; i++) {
    if(results[i].min < minTotal) {
        minTotal = results[i].min;
        minHours = results[i].minHours;
        minYear = results[i].year;
    }

    if(results[i].max < maxTotal) {
        maxTotal = results[i].max;
        maxHours = results[i].maxHours;
        maxYear = results[i].year;
    }
}

console.log(`
    Min Year: ${minYear} Min: ${minTotal} Hours: ${minHours} 
    Max Year: ${maxYear} Max: ${maxTotal} Hours: ${maxHours}`
);