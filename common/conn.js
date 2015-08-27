

var config = require('../config');
var pg = require('pg');
var MongoClient = require('mongodb').MongoClient;

///// LIVE
var http = require('http');
/////

/////// DEBUG
//var http = require('http-debug').http;
//// var https = require('http-debug').https;
//http.debug = 2;
///////
		
var async = require('async')
var collections = require('../rest/models').collections

var mongodb = {db:null, objectId:null};
var mongoTdb = {db:null, objectId:null};
var pgDataDB = null;
var pgGeonodeDB = null;
var io = null;


var pgDataConnString = config.pgDataConnString;
var pgGeonodeConnString = config.pgGeonodeConnString;
var mongoConnString = config.mongoConnString;
var mongoTempConnString = config.mongoTempConnString;


function getPgDataConnString() {
    return pgDataConnString;
}
function getPgGeonodeConnString() {
    return pgGeonodeConnString;
}

function getLocalAddress() {
    return config.localAddress;
}
function getRemoteAddress() {
    return config.remoteAddress;
}


function getGeoserverHost(){
	return config.geoserverHost;
}
function getGeoserverPort(){
	return config.geoserverPort;
}
function getGeoserverPath(){
	return config.geoserverPath;
}

function getGeoserver2Host(){
	return config.geoserver2Host;
}
function getGeoserver2Port(){
	return config.geoserver2Port;
}
function getGeoserver2Path(){
	return config.geoserver2Path;
}

function getGeonodeHost(){
	return config.geonodeHost;
}
function getGeonodePath(){
	return config.geonodePath;
}
function getGeonodeHome(){
	return config.geonodeHome;
}




function request(options,dataToWrite,callback) {
    var time = new Date().getTime();
//    if (!options.headers || !options.headers['Authorization']) {
//        console.log('no auth',options.host);
//        if (options.host == config.geonodeHost || options.host == config.baseServer) {
//            options.headers = options.headers || {};
//            var auth = 'Basic ' + new Buffer(config.authUser + ':' + config.authPass).toString('base64');
//            options.headers['Authorization'] = auth;
//            console.log('auth set');
//        }
//    }
    var reqs = http.request(options, function(resl){
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
    var username = 'admin';
    var password = 'GeoNodeGeoServerNr1';
    var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
    var headers = {
        'Authorization': auth
    };
    var options = {
        host: getGeoserverHost(),
        path: getGeoserverPath()+'/web',
        headers: headers,
        port: getGeoserverPort(),
        method: 'GET'
    };
    var jsid = null;
    request(options, null, function(err, output, resl) {
        if (err) {
            console.log("common/conn.js Geoserver request error: " + err);
            return;
        }
        var cookies = resl.headers['set-cookie'] || [];
        for (var i=0;i<cookies.length;i++) {
            var cookie = cookies[i];
            if (cookie.search('JSESSIONID')>-1) {
                jsid = cookie.split(';')[0].split('=')[1];
                break;
            }
        }
        require('../api/proxy').setJsid(jsid);

		//console.log("");
		//console.log("");
		//console.log("############### JSID ###############");
		//console.log("# "+jsid+" #");
		//console.log("####################################");

    })
}

function init(app,callback) {
    pgDataDB = new pg.Client(getPgDataConnString());
    pgDataDB.connect();
    pgGeonodeDB = new pg.Client(getPgGeonodeConnString());
    pgGeonodeDB.connect();
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
            if(!pgDataDB.activeQuery){
                clearInterval(reconnectCommand);
                pgDataDB.end();
                pgDataDB = new pg.Client(getPgDataConnString());
                pgDataDB.connect();
                console.log('Data DB reconnected ('+ pgDataDB.database +')');
            }else{
                console.log('Data DB waiting for reconnect ('+ pgDataDB.database +')');
            }
        },2000);
    },Math.round(1000*60*60*5.9));
	
    setInterval(function() {
        if (reconnectCommand) {
            clearInterval(reconnectCommand);
        }
        var reconnectCommand = setInterval(function() {
            if(!pgGeonodeDB.activeQuery){
                clearInterval(reconnectCommand);
                pgGeonodeDB.end();
                pgGeonodeDB = new pg.Client(getPgGeonodeConnString());
                pgGeonodeDB.connect();
                console.log('Geonode DB reconnected ('+ pgGeonodeDB.database +')');
            }else{
                console.log('Geonode DB waiting for reconnect ('+ pgGeonodeDB.database +')');
            }
        },2000);
    },Math.round(1000*60*60*5.42));
    
	async.parallel({
		mongodb: function(callback){
			mongoInit(mongoConnString, callback);
		},
		mongoTdb: function(callback){
			mongoInit(mongoTempConnString, callback);
		}
	}, function(err, results){
		mongodb = results.mongodb;
		mongoTdb = results.mongoTdb;
		//console.log('\n\n\nJak to dopadlo:\n1[', typeof mongodb, ':', mongodb, ']\n2[', typeof mongoTdb, ':', mongoTdb, ']\n\n\n');
		callback(err);
	});
	
    var server = require('http').createServer(app);
    //io = require('socket.io').listen(server,{log:false});// JJJ Tomas rikal, ze to rusime
    server.listen(3100);
}

function mongoInit(connString, callback) {
	//console.log('=-=-=-=-=-=-=-=-=-=- initializing MongoClient for ',connString);
	MongoClient.connect(connString, function(err, db) {
        if (err){
			return callback(err);
		}
        var mongoSettings = db.collection('settings');
        mongoSettings.findOne({_id:1},function(err,result) {
            var objectId = result ? result.objectId : null;
            if (err || !objectId) return callback(err);
            callback(null, {db:db, objectId:objectId});
        });
    });
}

function getIo() {
	return null;
    //return io;
}

function getNextId() {
    getMongoDb().objectId++;
    var mongoSettings = getMongoDb().db.collection('settings');
    mongoSettings.update({_id: 1}, {_id: 1,objectId: getMongoDb().objectId}, {upsert: true}, function() {})
    return getMongoDb().objectId;
}

function getMongoDb(temp) {
	if(temp === true){
		console.log('getMongoDb returning mongoTdb');
		return mongoTdb;
	}
	console.log('getMongoDb returning mongodb');
    return mongodb;
}

function getPgDataDb() {
    return pgDataDB;
}
function getPgGeonodeDb() {
    return pgGeonodeDB;
}


module.exports = {
    init: init,
	mongoInit: mongoInit,
    getIo: getIo,
    request: request,
    getMongoDb: getMongoDb,
    getPgDataDb: getPgDataDb,
    getPgGeonodeDb: getPgGeonodeDb,
    getNextId: getNextId,
    getLocalAddress: getLocalAddress,
	getRemoteAddress: getRemoteAddress,
	
	getPgDataConnString: getPgDataConnString,
    getPgGeonodeConnString: getPgGeonodeConnString,

	getGeoserverHost: getGeoserverHost,
	getGeoserverPort: getGeoserverPort,
	getGeoserverPath: getGeoserverPath,

	getGeoserver2Host: getGeoserver2Host,
	getGeoserver2Port: getGeoserver2Port,
	getGeoserver2Path: getGeoserver2Path,

	getGeonodeHost: getGeonodeHost,
	getGeonodePath: getGeonodePath,
	getGeonodeHome: getGeonodeHome
};
