const fs = require('fs');
const superagent = require('superagent');
const conn = require('../common/conn');
const config = require('../config');

const LoadMetadataForIntegration = require('../integration/lulc/LoadMetadataForIntegration');
const GeoJsonToSql = require('../integration/lulc/GeoJsonToSql');
const Uuid = require('../common/UUID');

const tables = {
    '586173924': ['i10_bamako_al1', 'i11_bamako_al2', 'i12_bamako_al3'],
    '486867095': ['i39_dhaka_al1', 'i40_dhaka_al2', 'i41_dhaka_al3'],
    '186174983': ['i13_fallujah_al1', 'i14_fallujah_al2', 'i15_fallujah_al3'],
    '486176350': ['i16_karachi_al1', 'i17_karachi_al2', 'i18_karachi_al3'],
    '386177288': ['i20_lima_al1', 'i21_lima_al2', 'i22_lima_al3'],
    '286177322': ['i36_mandalay_al1', 'i37_mandalay_al2', 'i38_mandalay_al3'],
    '386177498': ['i27_mwanza_al1', 'i28_mwanza_al2', 'i29_mwanza_al3'],
    '486177496': ['i30_phnompenh_al1', 'i31_phnompenh_al2', 'i32_phnompenh_al3'],
    '686177495': ['i33_ramadi_al1', 'i34_ramadi_al2', 'i35_ramadi_al3']
};

class LulcIntegrationController {
    constructor(app, mongo, pgPool) {
        this._mongo = mongo;
        this._pgPool = pgPool;

        app.get('/rest/integration/lulc', this.retrieveStateOfIntegration.bind(this));
        app.post('/rest/integration/lulcmeta', this.integrateResults.bind(this));
        app.post('/rest/integration/lulc', this.integrateData.bind(this));
    }

    retrieveStateOfIntegration(request, response) {
        const uuid = request.query.uuid;
        // Store somewhere state.
        this._mongo.collection('lulcintegration').find({uuid: uuid}).toArray().then(results => {
            response.json(results[0]);
        });
    }

    integrateResults(request, response) {
        console.log('Integrate Results: ', request.body);
        let id = conn.getNextId();
        const uuid = request.body.uuid;

        if(request.body.error) {
            this._mongo.collection('lulcintegration').update({uuid: uuid}, {
                state: 'Error',
                uuid: uuid
            });

            response.json({});
            return;
        }

        const inputForAnalysis = request.body;
        const layerRefs = [];
        inputForAnalysis.themes.forEach(theme => {
            if(theme.layerUnavailable || !theme.periods){
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
                            "_id": ++id,
                            "layer": 'geonode:' + auLevel.table,
                            "columnMap": attributes,
                            isData: true,
                            attributeSet: attributeSet.id,
                            location: inputForAnalysis.place,
                            year: period, // Periods depends on the analysis.
                            areaTemplate: auLevel.id,
                            active: true,
                            dataSourceOrigin: 'geonode'
                        });
                    })
                })
            })
        });
        // Generate and insert layerrefs
        // Insert LayerRefs into Mongo
        Promise.all(layerRefs.map(layerRef => {
            return this._mongo.collection('layerref').insert(layerRef);
        })).then(() => {
            return this._mongo.collection('lulcintegration').update({uuid: uuid}, {
                state: 'LayerRefs Inserted',
                uuid: uuid
            });
        }).then(() => {
            // Update the SQL
            let sql = '';
            inputForAnalysis.analyticalUnitLevels.forEach((auLevel, index) => {
                sql += new GeoJsonToSql(auLevel.layer, auLevel.table, index + 1).sql();
            });

            return this._pgPool.query(sql);
        }).then(() => {
            console.log('Done');
            return this._mongo.collection('lulcintegration').update({uuid: uuid}, {
                state: 'Done',
                uuid: uuid
            });
        }).then(() => {
            response.json({});
            // Run the SQL over PostgreSQL database.
            //TODO: Test the SQL
        }).catch(err => {
            console.log(err);

            this._mongo.collection('lulcintegration').update({uuid: uuid}, {
                state: 'Error: ' + err,
                uuid: uuid
            });

            response.json({});
        })
    }

    async integrateData(request, response) {
        const scopeId = Number(request.body.scopeId);
        const placeId = Number(request.body.placeId);
        const uuid = new Uuid().toString();
        let integrationInput;

        new LoadMetadataForIntegration(this._mongo, scopeId).metadata(placeId).then(pIntegrationInput => {
            integrationInput = pIntegrationInput;
            integrationInput.uuid = uuid;
            integrationInput.url = config.lulcUrl;

            integrationInput.layers = [];
            return Promise.all(Object.keys(request.files).map(fileKey => {
                const pathToFile = request.files[fileKey].path;
                const fileName = request.files[fileKey].originalFilename;
                if(!fileName) {
                    return Promise.resolve(true);
                }

                return new Promise((resolve, reject) => {
                    fs.readFile(pathToFile, 'utf8', (err, data) => {
                        if(err) {
                            reject(err);
                        } else {
                            resolve(result);
                        }
                    })
                }).then(result => {
                    // If fileName matches AL template push to proper AU templates instead.
                    let isAu = false;
                    integrationInput.analyticalUnitLevels.forEach(auLevel => {
                        if(RegExp(auLevel.template).test(fileName)) {
                            isAu = true;

                            auLevel.layer = JSON.parse(result);
                        }
                    });

                    if(!isAu) {
                        integrationInput.layers.push({
                            name: fileName.replace('\.geojson', ''),
                            content: JSON.parse(result)
                        })
                    }
                })
            }));
        }).then(() => {
            integrationInput.analyticalUnitLevels = integrationInput.analyticalUnitLevels.filter(au => au.layer);
            integrationInput.analyticalUnitLevels.forEach((auLevel, index) => {
                auLevel.table = tables[placeId][index];
            });

            return this._mongo.collection('lulcintegration').insert({
                state: 'running',
                uuid: uuid
            })
        }).then(() => {
            // Process the files and integrate them into the JSON.
            return superagent.post(config.remoteLulcProcessorUrl)
                .send(integrationInput);
        }).then(() => {
            return this._mongo.collection('lulcintegration').update({uuid: uuid}, {
                state: 'remote processing',
                uuid: uuid
            })
        }).then(() => {
            response.json({
                status: 'running',
                uuid: uuid
            })
        }).catch(err => {
            console.log('Error: ', err);

            this._mongo.collection('lulcintegration').update({uuid: uuid}, {
                state: 'Error',
                uuid: uuid
            });

            response.json({
                status: 'err',
                message: err
            })
        });
    }
}

module.exports = LulcIntegrationController;