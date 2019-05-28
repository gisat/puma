const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const superagent = require('superagent');
const LulcIntegrationController = require('../../../routes/LulcIntegrationController');

describe('LulcIntegrationController', ()=> {
    describe('#metadata', () => {
        it('properly creates views', done => {
            new Promise((resolve, reject) => {
                MongoClient.connect('mongodb://localhost:27017/panther', function(err, dbs) {
                    if(err) {
                        reject(err);
                    } else {
                        resolve(dbs);
                    }
                })
            }).then(mongodb => {
                const app = express();
                app.use(express.limit('2048mb'));
                app.use(express.bodyParser({limit: '100mb', parameterLimit: 1000000}));

                let server = app.listen(3345);
                server.setTimeout(600000);

                let id =4000;
                new LulcIntegrationController(app, mongodb, {
                    query: (sql) => {
                        console.log(sql);
                    }
                }, {
                    getNextId: () => {
                        return ++id;
                    }
                });

                return mongodb.collection('layerref').deleteMany({
                    areaTemplate: 1,
                    year: 1
                }).then(() => {
                    return mongodb.collection('layerref').deleteMany({
                        areaTemplate: 1,
                        year: 2
                    });
                }).then(() => {
                    return mongodb.collection('layerref').deleteMany({
                        areaTemplate: 2,
                        year: 1
                    });
                }).then(() => {
                    return mongodb.collection('layerref').deleteMany({
                        areaTemplate: 2,
                        year: 2
                    });
                }).then(() => {
                    return mongodb.collection('layerref').insertMany([{
                        _id: ++id,
                        isData: false,
                        fidColumn: '',
                        areaTemplate: 1,
                        location: 1,
                        year: 1,
                        layer: 'geonode: i11_dhaka_al1'
                    }, {
                        _id: ++id,
                        isData: false,
                        fidColumn: '',
                        areaTemplate: 2,
                        location: 1,
                        year: 1,
                        layer: 'geonode: i12_dhaka_al2'
                    }, {
                        _id: ++id,
                        isData: false,
                        fidColumn: '',
                        areaTemplate: 1,
                        location: 1,
                        year: 2,
                        layer: 'geonode: i11_dhaka_al1'
                    }, {
                        _id: ++id,
                        isData: false,
                        fidColumn: '',
                        areaTemplate: 2,
                        location: 1,
                        year: 2,
                        layer: 'geonode: i12_dhaka_al2'
                    }]);
                });

            }).then(() => {
                return superagent.post('http://localhost:3345/rest/integration/lulcmeta').send({
                    uuid: 1,
                    place: 1,
                    analyticalUnitLevels: [{
                        id : 1,
                        layer: {
                            features: [
                                {
                                    properties: {
                                        'as_4_attr_1': 123,
                                        'as_4_attr_2': 234
                                    }
                                }
                            ]
                        },
                        table: 'i11_dhaka_al1'
                    }, {
                        id : 2,
                        layer: {
                            features: [
                                {
                                    properties: {
                                        'as_4_attr_1': 123,
                                        'as_4_attr_2': 234
                                    }
                                }
                            ]
                        },
                        table: 'i12_dhaka_al2'
                    }],

                    themes: [{
                        id: 1,
                        periods: [1,2],
                        attributeSets: [
                            {
                                id: 4,
                                attributes: [
                                    {id: 1, code: 10000},
                                    {id: 2, code: 20000}
                                ],
                                columnName: 'C_L1',
                            },
                            {
                                id: 5,
                                attributes: [
                                    {id: 1, code: 11000},
                                    {id: 2, code: 12000}
                                ],
                                columnName: 'C_L2',
                            },
                            {
                                id: 6,
                                attributes: [
                                    {id: 1, code: 11100},
                                    {id: 2, code: 12100}
                                ],
                                columnName: 'C_L3',
                            }
                        ],
                        layerTemplates: [
                            {id: 1, layerNameTemplate: 'EO4SD_\.*_LULCVHR_\.*'}
                        ],
                        integrationType: 'landUseLandCoverVeryHighResolution'
                    }]
                })
            }).then(() => {
                done();
            }).catch(err => {
                console.log(err);

                done(err);
            });
        });
    })
});