const cluster = require('cluster');
const express = require('express');
const superagent = require('superagent');
const config = require('./config');

const CityAnalysisProcessor = require('./integration/lulc/CityAnalysisProcessor');
const S3Bucket = require('./storage/S3Bucket');

if(cluster.isMaster) {
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) { // TODO: return to full
        cluster.fork();
    }

    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.id + ' is online.');
    });

    cluster.on('exit', (worker, code, signal) => {
        if (code !== 0 && !worker.exitedAfterDisconnect) {
            console.log(`Worker ${worker.id} crashed. ` +
                'Starting a new worker...');
            cluster.fork();
        }
    });
} else {
    //
    const app = express();
    app.use(express.limit('2048mb'));
    app.use(express.bodyParser({limit: '500mb', parameterLimit: 1000000}));

    app.post('/cityLulc', (request, response) => {
        response.json({
            uuid: request.body.uuid
        });

        const integrationInput = request.body;
        const bucket = new S3Bucket(config.aws.name, config.aws.accessKeyId, config.aws.secretAccessKey);
        const promisesToWaitFor = [];

        integrationInput.layers.forEach(layer => {
            promisesToWaitFor.push(bucket.download(layer.content).then(result => {
                const name = layer.content;

                layer.content = JSON.parse(result.Body.toString());

                return bucket.delete(name);
            }));
        });
        integrationInput.analyticalUnitLevels.forEach(level => {
            promisesToWaitFor.push(bucket.download(level.layer).then(result => {
                const name = level.layer;

                level.layer = JSON.parse(result.Body.toString());
                level.nameInStorage = name;

                return bucket.delete(name);
            }));
        });

        Promise.all(promisesToWaitFor).then(() => {
            new CityAnalysisProcessor(integrationInput).geoJson();
            integrationInput.layers = [];

            return Promise.all(integrationInput.analyticalUnitLevels.map(level => {
                return bucket.upload(level.nameInStorage, JSON.stringify(level.layer));
            }));
        }).then(() => {
            return bucket.upload('integrationInput.json', JSON.stringify(integrationInput));
        }).then(() => {
            return superagent.post(request.body.url)
                .send(integrationInput)
        }).then(() => {
                console.log(request.body.uuid + ' Sent back')
        }).catch(err => {
                console.log('Error: ', err);
        });
    });

    app.listen(80);
}