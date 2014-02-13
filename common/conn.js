

var config = require('../config');
var pg = require('pg');
var MongoClient = require('mongodb').MongoClient;
var http = require('http');
var async = require('async')
var collections = require('../rest/models').collections

var mongodb = null;
var pgdb = null;
var objectId = null;
var io = null;



var connString = config.connString;
var mongoConnString = config.mongoConnString;

function getConnString() {
    return connString;
}

function getLocalAddress() {
    return config.localAddress;
}

function getBaseServer() {
    return config.baseServer;
}

function getGeonodeServer() {
    return config.geonodeServer;
}
function getPort() {
    return config.port;
}




function request(options,dataToWrite,callback) {
    var time = new Date().getTime();
    
    var reqs = http.request(options, function(resl)
    {
        var output = '';
        resl.setEncoding(options.resEncoding || 'utf8' ) ;
        //console.log(resl.headers['geowebcache-cache-result'] || 'none');
        resl.on('data', function (chunk) {
            output += chunk;
        });
        resl.once('end', function() {
            return callback(null,output,resl);
       
        });
    });
    reqs.setMaxListeners(0);
//    reqs.once('socket', function (socket) {
//        socket.setMaxListeners(0);
//        socket.setTimeout(options.timeout || 60000); 
//        socket.once('timeout', function() {
//            reqs.abort();
//            return callback(new Error('sockettimeout'))
//        });
//    })
    
    reqs.once('error',function(error) {
        return callback(error)
    })
    if (dataToWrite) {
        reqs.write(dataToWrite);
    }
    reqs.end();   
    return reqs;
}


function initGeoserver() {
    var username = 'gnode';
    var password = 'geonode';
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    var headers = {
        'Authorization': auth
    };
    var options = {
        host: getBaseServer(),
        path: '/geoserver/web',
        headers: headers,
        port: getPort(),
        method: 'GET'
    };
    var jsid = null;
    request(options, null, function(err, output, resl) {
        if (err) {
            console.log(err);
            return;
        }
        var cookies = resl.headers['set-cookie'];
        for (var i=0;i<cookies.length;i++) {
            var cookie = cookies[i];
            if (cookie.search('JSESSIONID')>-1) {
                jsid = cookie.split(';')[0].split('=')[1];
                break;
            }
        }
        require('../api/proxy').setJsid(jsid);
    })
}

function init(app,callback) {
   
    pgdb = new pg.Client(connString);
    pgdb.connect();
    var reconnectCommand = null;
    
    setInterval(function() {
        initGeoserver();
    },590000);
    initGeoserver();
    // keeping connection alive
    setInterval(function() {    
        if (reconnectCommand) {
            clearInterval(reconnectCommand);
        }
        var reconnectCommand = setInterval(function() {
            if (!pgdb.activeQuery) {
                clearInterval(reconnectCommand);
                pgdb.end();
                pgdb = new pg.Client(connString);
                pgdb.connect();
                console.log('reconnected')
            }
            else {
                console.log('waiting for reconnect')
            }
        },2000)
    },Math.round(1000*60*60*5.9))
    MongoClient.connect(mongoConnString, function(err, dbs) {
        if (err) return callback(err)
        mongodb=dbs;
        var mongoSettings = mongodb.collection('settings');
        mongoSettings.findOne({_id:1},function(err,result) {
            objectId = result ? result.objectId : null;
            if (err || !objectId) return callback(err)
            callback();
        })
    });

    var server = require('http').createServer(app)
    io = require('socket.io').listen(server,{log:false})
    server.listen(3101)
}

function getIo() {
    return io;
}

function getNextId() {
    objectId++;
    var mongoSettings = mongodb.collection('settings');
    mongoSettings.update({_id: 1}, {_id: 1,objectId: objectId}, {upsert: true}, function() {})
    return objectId;
}

function getMongoDb() {
    return mongodb;
}

function getPgDb() {
    return pgdb;
}


module.exports = {
    init: init,
    getIo: getIo,
    request: request,
    getMongoDb: getMongoDb,
    getPgDb: getPgDb,
    getNextId: getNextId,
    getLocalAddress: getLocalAddress,
    getConnString: getConnString,
    getBaseServer: getBaseServer,
    getGeonodeServer: getGeonodeServer,
    getPort: getPort
    
}
