// Script to be run on NodeJS environment. In this case you need to modify the code to load something else than buildings or in a different area.

let superagent = require('superagent');
let osmtogeojson = require('osmtogeojson');
let fs = require('fs');

superagent
    .post('https://overpass-api.de/api/interpreter')
    .type('form')
    .send('[out:json][timeout:25];(way[building](49.9154703,14.1642328,50.1835442,14.7272819); relation[building](49.9154703,14.1642328,50.1835442,14.7272819); ); out body; >; out skel qt;')
    .then(result => {
        let geojson = osmtogeojson(result.body);

        geojson.features.forEach(feature => {
            let height;
            if (feature.properties && feature.properties.height) {
                height = feature.properties.height;
            } else if (feature.properties && feature.properties["building:levels"]) {
                height = feature.properties["building:levels"] * 3;
            } else if (feature.properties.tags && feature.properties.tags.height) {
                height = feature.properties.tags.height;
            } else if (feature.properties.tags && feature.properties.tags["building:levels"]) {
                height = feature.properties.tags["building:levels"] * 3;
            } else {
                return;
            }

            feature.properties.height = height;
        });
        geojson.features = geojson.features.filter(feature => feature.properties.height);

        fs.writeFile('praha.json', JSON.stringify(geojson), err => {
            if (err) {
                console.error(err);
            } else {
                console.log('Success');
            }
        })
    }).catch(err => {
    console.error(err);
});