const cluster = require('cluster');
const express = require('express');
const superagent = require('superagent');

const IntegrateCityProcessor = require('./integration/lulc/IntegrateCityProcessor');

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
    app.use(express.bodyParser({limit: '100mb', parameterLimit: 1000000}));

    app.post('/cityLulc', (request, response) => {
        response.json({
            uuid: request.body.uuid
        });

        const integrationInput = request.body;
        new IntegrateCityProcessor(integrationInput).geoJson();
        integrationInput.layers = [];

        superagent.post(request.body.url)
            .send(integrationInput).then(() => {
                console.log(request.body.uuid + ' Sent back')
        }).catch(err => {
                console.log('Error: ', err);
        });
    });

    app.listen(3568);
}