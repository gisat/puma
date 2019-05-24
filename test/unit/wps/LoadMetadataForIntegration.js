const fs = require('fs').promises;

const MongoClient = require('mongodb').MongoClient;
const LoadMetadataForIntegration = require('../../../integration/lulc/LoadMetadataForIntegration');

describe('LoadMetadataForIntegration', () => {
    describe('#json', () => {
        it('Provides json with relevant metadata', function(done) {
            let mongodb;
            MongoClient.connect('mongodb://localhost:27017/panther', function(err, dbs) {
                if (err) {
                    return callback(err);
                }
                mongodb = dbs;

                new LoadMetadataForIntegration(mongodb, 600000000).metadata('Argentina').then(result => {
                    console.log(result);

                    return fs.writeFile(`./test/unit/wps/integrateCity/sourceData.json`, JSON.stringify(result), 'utf8');
                }).then(() => {
                    // Save the scope as JSON.
                    done();
                }).catch(err => {
                    done(err);
                });
            });
        });
    })
});