const fs = require('fs').promises;
const superagent = require('superagent');

const LoadMetadataForIntegration = require('../integration/lulc/LoadMetadataForIntegration');
const Uuid = require('../common/UUID');

const tables = {
    '586173924': ['i10_bamako_al1', 'i11_bamako_al2', 'i12_bamako_al3'],
    '486867095': ['i39_dhaka_al1', 'i40_dhaka_al2', 'i41_dhaka_al3'],
    '456908': ['i13_fallujah_al1', 'i14_fallujah_al2', 'i15_fallujah_al3'],
    '486176350': ['i16_karachi_al1', 'i17_karachi_al2', 'i18_karachi_al3'],
    '386177288': ['i20_lima_al1', 'i21_lima_al2', 'i22_lima_al3'],
    '286177322': ['i36_mandalay_al1', 'i37_mandalay_al2', 'i38_mandalay_al3'],
    '386177498': ['i27_mwanza_al1', 'i28_mwanza_al2', 'i29_mwanza_al3'],
    '486177496': ['i30_phnompenh_al1', 'i31_phnompenh_al2', 'i32_phnompenh_al3'],
    '686177495': ['i33_ramadi_al1', 'i34_ramadi_al2', 'i35_ramadi_al3']
};

class LulcIntegrationController {
    constructor(app, mongo) {
        this._mongo = mongo;

        app.get('/rest/integration/lulc', this.retrieveStateOfIntegration.bind(this));
        app.post('/rest/integration/lulcmeta', this.integrateResults.bind(this));
        app.post('/rest/integration/lulc', this.integrateData.bind(this));
    }

    retrieveStateOfIntegration(request, response) {

    }

    integrateResults(request, response) {
        console.log('Integrate Results: ', request.body);
    }

    async integrateData(request, response) {
        const scopeId = Number(request.body.scopeId);
        const placeId = Number(request.body.placeId);
        const uuid = new Uuid().toString();
        let integrationInput;

        new LoadMetadataForIntegration(this._mongo, scopeId).metadata(placeId).then(pIntegrationInput => {
            integrationInput = pIntegrationInput;
            integrationInput.uuid = uuid;
            integrationInput.url = 'http://localhost:3345/rest/integration/lulcmeta';

            integrationInput.layers = [];
            return Promise.all(Object.keys(request.files).map(fileKey => {
                const pathToFile = request.files[fileKey].path;
                const fileName = request.files[fileKey].originalFilename;
                return fs.readFile(pathToFile, 'utf8').then(result => {
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

            // Process the files and integrate them into the JSON.
            return superagent.post('http://localhost:3568/cityLulc')
                .send(integrationInput);
        }).then(() => {
            response.json({
                status: 'running',
                uuid: uuid
            })
        }).catch(err => {
            console.error(err);
            response.json({
                status: 'err',
                message: err
            })
        });
    }
}

module.exports = LulcIntegrationController;