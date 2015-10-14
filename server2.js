var forever = require('forever-monitor');

  var child = new (forever.Monitor)('server.js', {
    //silent: true,
    options: []
  });

  child.on('exit', function () {
    console.log('server has exited after 3 restarts');
  });

  child.start();

