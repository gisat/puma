let moment = require('moment');
let results = {
    "2016Winter": [],
    "2016Summer": [],
    "2015Winter": [],
    "2015Summer": [],
    "2013Winter": [],
    "2013Summer": []
};
let file;
let netcdf4 = require("netcdf4");

function handleData(file, times, time) {
    let coords = file.root.dimensions['lat'].length;
    for(let lat = 0; lat < coords; lat++){
        for(let lon = 0; lon < coords; lon++) {
            console.log(`Time: ${time} Coords: ${coords} Lat: ${lat} Lon: ${lon} `);

            times.forEach(time => {
                let result = file.root.variables['temperature'].read(time.hours, lon, lat);
                time.total++;
                time.average += result;
            })
        }
    }
}

// Handle 2016 Winter
file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2016_T2M.nc", "r");

let startTimeMin = moment('2016-02-01T03:00:00.000Z');
let startTimeMax = moment('2016-02-02T00:00:00.000Z');

let startingHours = startTimeMax.diff(startTimeMin, 'hours');
for(let i = 0; i < 30; i++) {
    results["2016Winter"].push({hours: startingHours + i * 24 + 3, label: moment(startTimeMax).add(i * 24 + 3, 'hours').format(), average: 0, total: 0});
    results["2016Winter"].push({hours: startingHours + i * 24 + 15, label: moment(startTimeMax).add(i * 24 + 15, 'hours').format(), average: 0, total: 0});
}

handleData(file, results["2016Winter"], "2016Winter");


// Handle 2016 Summer
startTimeMax = moment('2016-07-01T00:00:00Z');

startingHours = startTimeMax.diff(startTimeMin, 'hours');
for(let i = 0; i < 30; i++) {
    results["2016Summer"].push({hours: startingHours + i * 24 + 3, label: moment(startTimeMax).add(i * 24 + 3, 'hours').format(), average: 0, total: 0});
    results["2016Summer"].push({hours: startingHours + i * 24 + 15, label: moment(startTimeMax).add(i * 24 + 15, 'hours').format(), average: 0, total: 0});
}

handleData(file, results["2016Summer"], "2016Summer");


// Handle 2015 Winter
file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2015_T2M.nc", "r");

startTimeMin = moment('2015-02-01T03:00:00Z');
startTimeMax = moment('2015-02-02T00:00:00Z');

startingHours = startTimeMax.diff(startTimeMin, 'hours');
for(let i = 0; i < 30; i++) {
    results["2015Winter"].push({hours: startingHours + i * 24 + 3, label: moment(startTimeMax).add(i * 24 + 3, 'hours').format(), average: 0, total: 0});
    results["2015Winter"].push({hours: startingHours + i * 24 + 15, label: moment(startTimeMax).add(i * 24 + 15, 'hours').format(), average: 0, total: 0});
}

handleData(file, results["2015Winter"], "2015Winter");

// Handle 2015 Summer
startTimeMax = moment('2015-07-01T00:00:00Z');

startingHours = startTimeMax.diff(startTimeMin, 'hours');
for(let i = 0; i < 30; i++) {
    results["2015Summer"].push({hours: startingHours + i * 24 + 3, label: moment(startTimeMax).add(i * 24 + 3, 'hours').format(), average: 0, total: 0});
    results["2015Summer"].push({hours: startingHours + i * 24 + 15, label: moment(startTimeMax).add(i * 24 + 15, 'hours').format(), average: 0, total: 0});
}

handleData(file, results["2015Summer"], "2015Summer");




// Handle 2013 Winter
file = new netcdf4.File("/data/Users/jbalhar/Projects/PUCS/Data/valid_urbclim_output_prague_2013_T2M.nc", "r");
startTimeMin = moment('2013-02-01T03:00:00Z');
startTimeMax = moment('2013-02-02T00:00:00Z');

startingHours = startTimeMax.diff(startTimeMin, 'hours');
for(let i = 0; i < 30; i++) {
    results["2013Winter"].push({hours: startingHours + i * 24 + 3, label: moment(startTimeMax).add(i * 24 + 3, 'hours').format(), average: 0, total: 0});
    results["2013Winter"].push({hours: startingHours + i * 24 + 15, label: moment(startTimeMax).add(i * 24 + 15, 'hours').format(), average: 0, total: 0});
}

handleData(file, results["2013Winter"], "2013Winter");


// Handle 2013 Summer
startTimeMax = moment('2013-07-01T00:00:00Z');

startingHours = startTimeMax.diff(startTimeMin, 'hours');
for(let i = 0; i < 30; i++) {
    results["2013Summer"].push({hours: startingHours + i * 24 + 3, label: moment(startTimeMax).add(i * 24 + 3, 'hours').format(), average: 0, total: 0});
    results["2013Summer"].push({hours: startingHours + i * 24 + 15, label: moment(startTimeMax).add(i * 24 + 15, 'hours').format(), average: 0, total: 0});
}

handleData(file, results["2013Summer"], "2013Summer");


console.log('2016 Winter');
results["2016Winter"].forEach(result => {
    console.log('Time: ', result.label, ' Value: ', (result.average / result.total));
});

console.log('2016 Summer');
results["2016Summer"].forEach(result => {
    console.log('Time: ', result.label, ' Value: ', (result.average / result.total));
});


console.log('2015 Winter');
results["2015Winter"].forEach(result => {
    console.log('Time: ', result.label, ' Value: ', (result.average / result.total));
});

console.log('2015 Summer');
results["2015Summer"].forEach(result => {
    console.log('Time: ', result.label, ' Value: ', (result.average / result.total));
});

console.log('2013 Winter');
results["2013Winter"].forEach(result => {
    console.log('Time: ', result.label, ' Value: ', (result.average / result.total));
});

console.log('2013 Summer');
results["2013Summer"].forEach(result => {
    console.log('Time: ', result.label, ' Value: ', (result.average / result.total));
});