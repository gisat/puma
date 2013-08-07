


var pg = require('pg');
var MongoClient = require('mongodb').MongoClient;
var http = require('http');
var async = require('async')
var collections = require('../rest/models').collections

var mongodb = null;
var pgdb = null;
var objectId = null;
var io = null;

function request(options,dataToWrite,callback) {
    var reqs = http.request(options, function(resl)
    {
        var output = '';
        resl.setEncoding(options.resEncoding || 'utf8' ) ;
        resl.on('data', function (chunk) {
            output += chunk;
        });
        resl.on('end', function() {
            
            return callback(null,output,resl);
       
        });
    });
    reqs.on('socket', function (socket) {
        socket.setTimeout(options.timeout || 60000); 
        socket.on('timeout', function() {
            reqs.abort();
            return callback(new Error('sockettimeout'))
        });
    })
    
    reqs.on('error',function(error) {
        return callback(error)
    })
    if (dataToWrite) {
        reqs.write(dataToWrite);
    }
    reqs.end();   
}

function getConnString() {
    return "postgres://geonode:VQq2xbJw@192.168.2.8:5432/geonode";
}

function init(app,callback) {
   
    var conString = "postgres://geonode:VQq2xbJw@192.168.2.8:5432/geonode";
    pgdb = new pg.Client(conString);
    pgdb.connect();
    var reconnectCommand = null;
    // keeping connection alive
    setInterval(function() {    
        if (reconnectCommand) {
            clearInterval(reconnectCommand);
        }
        var reconnectCommand = setInterval(function() {
            if (!pgdb.activeQuery) {
                clearInterval(reconnectCommand);
                pgdb.end();
                pgdb = new pg.Client(conString);
                pgdb.connect();
                console.log('reconnected')
            }
            else {
                console.log('waiting for reconnect')
            }
        },2000)
    },Math.round(1000*60*60*5.9))
    
    MongoClient.connect("mongodb://192.168.2.13:27017/test", function(err, dbs) {
        if (err) callback(err)
        mongodb=dbs;
        var mongoSettings = mongodb.collection('settings');
        mongoSettings.findOne({_id:1},function(err,result) {
            objectId = result ? result.objectId : 10;
            if (err) callback(err)
            callback();
        })
    });

    var server = require('http').createServer(app)
    io = require('socket.io').listen(server,{log:false})
    server.listen(3100)
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
    getConnString: getConnString
}
