const fs = require('fs').promises;
const MongoClient = require('mongodb').MongoClient;

const IntegrateCityProcessor = require('./IntegrateCityProcessor');
const LoadMetadataForIntegration = require('./LoadMetadataForIntegration');

const scopeId = Number(process.argv[2]);
const place = Number(process.argv[3]);
const placeName = process.argv[4];
let id = Number(process.argv[5]);
// TODO: Add the information about the table that should be updated
// TODO: Generate the layerref
const pathToDirectory = process.argv[5];

const tables = {
    'bamako': ['i10_bamako_al1', 'i11_bamako_al2', 'i12_bamako_al3'],
    'dhaka': ['i39_dhaka_al1', 'i40_dhaka_al2', 'i41_dhaka_al3'],
    'fallujah': ['i13_fallujah_al1', 'i14_fallujah_al2', 'i15_fallujah_al3'],
    'karachi': ['i16_karachi_al1', 'i17_karachi_al2', 'i18_karachi_al3'],
    'lima': ['i20_lima_al1', 'i21_lima_al2', 'i22_lima_al3'],
    'mandalay': ['i36_mandalay_al1', 'i37_mandalay_al2', 'i38_mandalay_al3'],
    'mwanza': ['i27_mwanza_al1', 'i28_mwanza_al2', 'i29_mwanza_al3'],
    'phnom_penh': ['i30_phnompenh_al1', 'i31_phnompenh_al2', 'i32_phnompenh_al3'],
    'ramadi': ['i33_ramadi_al1', 'i34_ramadi_al2', 'i35_ramadi_al3']
};


let inputForAnalysis;
// Prepare Mongo
new Promise((resolve, reject) => {
    MongoClient.connect('mongodb://localhost:27017/panther', function(err, dbs) {
        if(err) {
            reject(err);
        } else {
            resolve(dbs);
        }
    })
}).then(async mongoDb => {
    inputForAnalysis = await new LoadMetadataForIntegration(mongoDb, scopeId).metadata(place);
    // Load the list of files from directory
    const filesInDirectory = await fs.readdir(pathToDirectory);
    // Names of the files in the specific directory
    inputForAnalysis.layers = [];
    return Promise.all(filesInDirectory.map(fileName => {
        return fs.readFile(pathToDirectory + '/' + fileName, 'utf8').then(result => {
            // If fileName matches AL template push to proper AU templates instead.
            let isAu = false;
            inputForAnalysis.analyticalUnitLevels.forEach(auLevel => {
                if(RegExp(auLevel.template).test(fileName)) {
                    isAu = true;

                    auLevel.layer = JSON.parse(result);
                }
            });

            if(!isAu) {
                inputForAnalysis.layers.push({
                    name: fileName.replace('\.geojson', ''),
                    content: JSON.parse(result)
                })
            }
        })
    }))
}).then(async () => {
    inputForAnalysis.analyticalUnitLevels = inputForAnalysis.analyticalUnitLevels.filter(au => au.layer);
    inputForAnalysis.analyticalUnitLevels.forEach((auLevel, index) => {
        auLevel.table = tables[placeName][index];
    });


    // All the layers from the directory are loaded.
    const geoJsons = new IntegrateCityProcessor(inputForAnalysis).geoJson();
    const layerRefs = [];
    inputForAnalysis.themes.forEach(theme => {
        if(theme.layerUnavailable){
            return;
        }

        inputForAnalysis.analyticalUnitLevels.forEach(auLevel => {
            theme.periods.forEach(period => {
                theme.attributeSets.forEach(attributeSet => {
                    const attributes = [];

                    attributeSet.attributes.forEach(attribute => {
                        attributes.push({
                            column: `as_${attributeSet.id}_attr_${attribute.id}`,
                            attribute: attribute.id
                        })
                    });

                    layerRefs.push({
                        "id": ++id,
                        "layer": 'geonode:' + auLevel.table,
                        "columnMap": attributes,
                        isData: true,
                        attributeSet: attributeSet.id,
                        location: place,
                        year: period, // Periods depends on the analysis.
                        areaTemplate: auLevel.id,
                        active: true,
                        dataSourceOrigin: 'geonode'
                    });
                })
            })
        })
    });

    return Promise.all(geoJsons.map((geoJson, index) => {
        return fs.writeFile('GeoJsonAu' + index + '.geojson', JSON.stringify(geoJson), 'utf8').then(() => {
            return fs.writeFile('GeoJsonAuMeta' + index + '.json', JSON.stringify(layerRefs), 'utf8');
        });
    }))
}).then(async () => {
    // Transform GeoJSON to SQL

    // Just generate relevant layrrefs? Integrate separately?

}).catch(err => {
    console.error('Err: ', err);
}) ;
// Export the json specifying the analysis

// Take Directory from command line arguments
// Load Files from the directory.

// Run the analysis fully
// Export in .sql results.