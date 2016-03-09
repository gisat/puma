var config = require('../config');
var pg = require('pg');
var _ = require('underscore');
var MongoClient = require('mongodb').MongoClient;

var http = require('http');
var https = require('https');

//maybe one day we can switch to request instead of http and https
//var requestPackage = require('request'); // request was taken by conn.request

/////// DEBUG
//var http = require('http-debug').http;
//var https = require('http-debug').https;
//http.debug = 2;
///////
		
var async = require('async');

var mongodb = null;
var pgDataDBMap = {};
var pgGeonodeDB = null;
var objectId = null;




function request(options,dataToWrite,callback) {

	console.log("\n\n============= common/conn.request options:\n", options); ////////////////////////////////////////////
	console.log("==========================================\n\n"); ///////////////////////////////////////////////////////

	var time = new Date().getTime();
//	if (!options.headers || !options.headers['Authorization']) {
//		console.log('no auth',options.host);
//		if (options.host == config.geonodeHost || options.host == config.baseServer) {
//			options.headers = options.headers || {};
//			var auth = 'Basic ' + new Buffer(config.authUser + ':' + config.authPass).toString('base64');
//			options.headers['Authorization'] = auth;
//			console.log('auth set');
//		}
//	}

	var requestEngine = (["https","https:","https://"].indexOf(options.protocol)!=-1) ? https : http;

	delete options.protocol;

	var reqs = requestEngine.request(options, function(resl){
		var output = '';
		resl.setEncoding(options.resEncoding || 'utf8' );
		//console.log(resl.headers['geowebcache-cache-result'] || 'none');
		resl.on('data', function (chunk) {
			output += chunk;
		});
		resl.once('end', function() {
			return callback(null,output,resl);
		});
	});
	reqs.setMaxListeners(0);

	reqs.once('error',function(error) {
		return callback(error);
	});
	if (dataToWrite) {
		reqs.write(dataToWrite);
	}
	reqs.end();
	return reqs;
}


function initGeoserver() {
	var username = config.geoserverUsername;
	var password = config.geoserverPassword;
	var auth = 'Basic ' + new Buffer(username + ':' + password).toString('base64');
	var headers = {
		'Authorization': auth
	};
	var options = {
		host: config.geoserverHost,
		path: config.geoserverPath+'/web',
		headers: headers,
		port: config.geoserverPort,
		method: 'GET'
	};
	var jsid = null;
	request(options, null, function(err, output, resl) {
		if (err) {
			console.log("\n\ncommon/conn.initGeoserver Geoserver request error:", err, "\noutput:", output, "\n\n");
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

	});
}

function initDatabases(pgDataConnMap, pgGeonodeConnString, mongoConnString, callback) {
	pgGeonodeDB = connectToPgDb(pgGeonodeConnString);
	_.mapObject(pgDataConnMap, function(db, name){
		pgDataDBMap[name] = connectToPgDb(db.pgConnString);
	},this);

	// keeping connection alive
	setInterval(function() {
		var date = new Date();
		var reconnectingSession = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + "." + date.getMinutes() + "." + date.getSeconds();
		console.log("\n\nreconnecting session", reconnectingSession);
		_.mapObject(pgDataDBMap ,function(pgDB, name){
			reconnectPgDB(pgDB, function(err){
				if(err){
					console.log('Error: PG data DB '+name+' NOT reconnected. Error:',err);
				}else{
					console.log("PG data DB "+name+" reconnected");
				}
			});
		});
		reconnectPgDB(pgGeonodeDB, function(err){
			if(err){
				console.log('Error: PG GeoNode DB NOT reconnected. Error:',err);
			}else{
				console.log("PG GeoNode DB reconnected");
			}
		});
	}, Math.round(1000*60*60*5)); // 5 hours cycle

	MongoClient.connect(mongoConnString, function(err, dbs) {
		if (err){
			return callback(err);
		}
		mongodb=dbs;
		var mongoSettings = mongodb.collection('settings');
		mongoSettings.findOne({_id:1},function(err,result) {
			objectId = result ? result.objectId : null;
			if (err || !objectId) return callback(err);
			callback();
		});
	});
}

function init(app, callback) {
	setInterval(function() {
		initGeoserver();
	},1000*60*10);
	initGeoserver();

	initDatabases(config.pgDataConnMap, config.pgGeonodeConnString, config.mongoConnString, callback);

	//var server = require('http').createServer(app);
	//server.listen(3100);
}

function getIo() {
	return null;
	//return io;
}

function getNextId() {
	objectId++;
	var mongoSettings = getMongoDb().collection('settings');
	mongoSettings.update({_id: 1}, {_id: 1,objectId: objectId}, {upsert: true}, function() {});
	return objectId;
}

function getMongoDb() {
	return mongodb;
}

function getPgDataDb(name) {
	if(!name){
		throw new Error("conn.getPgDataDb: argument name is null or missing.");
	}
	if(!pgDataDBMap[name]){
		throw new Error("conn.getPgDataDb: PostgreSQL database connection with name '"+name+"' not found.");
	}
	return pgDataDBMap[name];
}

function getPgGeonodeDb() {
	return pgGeonodeDB;
}

function connectToPgDb(connectionStringOrObject, callback) {
	//console.log("--------------- Connecting to PG DB ", connectionStringOrObject);
	var pgDatabase = new pg.Client(connectionStringOrObject);
	pgDatabase.connect(callback);
	return pgDatabase;
}

function reconnectPgDB(db, callback){
	//console.log("reconnecting: START " + db.connectionParameters.host+":"+db.connectionParameters.port+"/"+db.connectionParameters.database);
	if (reconnectCommand) {
		clearInterval(reconnectCommand);
	}
	var reconnectCommand = setInterval(function() {
		if(!db.activeQuery){
			db.end();
			db = connectToPgDb(db.connectionParameters, function(err){
				if(err){
					callback(err);
				}else{
					//console.log("reconnecting: SUCCESS " + db.connectionParameters.host+":"+db.connectionParameters.port+"/"+db.connectionParameters.database);
					clearInterval(reconnectCommand);
					callback(null);
				}
			});
		}else{
			console.log("reconnecting: WAITING " + db.connectionParameters.host+":"+db.connectionParameters.port+"/"+db.connectionParameters.database+" (Waiting for reconnect. There is an active query.)");
		}
	},3000);
}

function getLayerTable(layer){
	var workspaceDelimiterIndex = layer.indexOf(":");
	if(workspaceDelimiterIndex == -1){
		console.log("Warning: getLayerTable got parameter '"+layer+"' without schema delimiter (colon).");
		return layer;
	}
	var workspace = layer.substr(0, workspaceDelimiterIndex);
	var layerName = layer.substr(workspaceDelimiterIndex + 1);
	if(!config.workspaceSchemaMap.hasOwnProperty(workspace)){
		console.log("Error: getLayerTable got layer with unknown workspace '"+ workspace +"'.");
		return layer;
	}
	return config.workspaceSchemaMap[workspace] + "." + layerName;
}


module.exports = {
	init: init,
	getIo: getIo,
	request: request,
	connectToPgDb: connectToPgDb,
	initDatabases: initDatabases,
	getMongoDb: getMongoDb,
	getPgDataDb: getPgDataDb,
	getPgGeonodeDb: getPgGeonodeDb,
	getNextId: getNextId,
	getLayerTable: getLayerTable
};
