var cluster = require('cluster');

if(cluster.isMaster) {
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }
    
    cluster.on('exit', (worker, code, signal) => {
      if (code !== 0 && !worker.exitedAfterDisconnect) {
        console.log(`Worker ${worker.id} crashed. ` +
                    'Starting a new worker...');
        cluster.fork();
      }
    });
} else {
    require('./server');
}
