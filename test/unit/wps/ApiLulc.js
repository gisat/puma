const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const superagent = require('superagent');

const LulcIntegrationController = require('../../../routes/LulcIntegrationController');

describe('ApiLulc', () => {
    it('receives properly the data', done => {
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

            new LulcIntegrationController(app, mongodb);

            return superagent.post('http://localhost:3345/rest/integration/lulc')
                .attach('lulc', 'C:\\Users\\jakub\\IdeaProjects\\Panther\\puma\\dhaka\\EO4SD_DHAKA_AL1.geojson')
                .attach('au', 'C:\\Users\\jakub\\IdeaProjects\\Panther\\puma\\dhaka\\EO4SD_DHAKA_LULCVHR_2017.geojson')
                .field('scopeId', 600000000)
                .field('placeId', 456908)
        }).then(() => {
            done();
        }).catch(err => {
            done(err);
        })
    })
});