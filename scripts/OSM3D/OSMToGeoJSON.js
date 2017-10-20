// Script to be run on NodeJS environment. In this case you need to modify the code to load something else than buildings or in a different area.

let superagent = require('superagent');
let osmtogeojson = require('osmtogeojson');
let fs = require('fs');

superagent
    .post('https://overpass-api.de/api/interpreter')
    .type('form')
    .send('[out:json][timeout:25];(way[building](48.8376569,17.0786994,48.8692833,17.1734567); relation[building](48.8376569,17.0786994,48.8692833,17.1734567); ); out body; >; out skel qt;')
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

        fs.writeFile('hodonin.json', JSON.stringify(geojson), err => {
            if (err) {
                console.error(err);
            } else {
                console.log('Success');
            }
        })
    }).catch(err => {
    console.error(err);
});