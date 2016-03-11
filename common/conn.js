var config = require('../config');
var pg = require('pg');
var _ = require('underscore');
var Pool = require('generic-pool').Pool;
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
var pgDataDBMap = {}; // todo replace with pool
var pgDataDBPoolMap = {};
var pgGeonodeDB = null; // todo replace with pool
var pgGeonodeDBPool = null;
var objectId = null;


// todo to be removed
var pgReconnectInterval = Math.round(1000*60*60*5); // 5 hour
//var pgReconnectInterval = 1000 * 60; // debugging quick loop

var geonodeServiceDbName = "_geonode_service_db";



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

/**
 * Create PG connection pools ang Mongo connection
 * @param pgDataConnMap
 * @param pgGeonodeConnString
 * @param mongoConnString
 * @param callback Callback params: err
 */
function initDatabases_pooling(pgDataConnMap, pgGeonodeConnString, mongoConnString, callback){
	pgGeonodeDBPool = createPgPool(geonodeServiceDbName, pgGeonodeConnString);
	_.each(pgDataConnMap, function(db, name){
		pgDataDBPoolMap[name] = createPgPool(name, db.pgConnString);
	},this);

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

// todo to be removed
function initDatabases(pgDataConnMap, pgGeonodeConnString, mongoConnString, callback) {
	pgGeonodeDB = connectToPgDb(pgGeonodeConnString);
	_.each(pgDataConnMap, function(db, name){
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
	}, pgReconnectInterval);

	// this is already called in initDatabases_pooling
	//MongoClient.connect(mongoConnString, function(err, dbs) {
	//	if (err){
	//		return callback(err);
	//	}
	//	mongodb=dbs;
	//	var mongoSettings = mongodb.collection('settings');
	//	mongoSettings.findOne({_id:1},function(err,result) {
	//		objectId = result ? result.objectId : null;
	//		if (err || !objectId) return callback(err);
	//		callback();
	//	});
	//});
}

function init(app, callback) {
	setInterval(function() {
		initGeoserver();
	},1000*60*10);
	initGeoserver();

	initDatabases(config.pgDataConnMap, config.pgGeonodeConnString, config.mongoConnString, callback);
	initDatabases_pooling(config.pgDataConnMap, config.pgGeonodeConnString, config.mongoConnString, callback);
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

/**
 * Creates PG DB connection pool
 * @param connectionName Connection name string
 * @param connectionStringOrObject Connection string or connection options object
 */
function createPgPool(connectionName, connectionStringOrObject){
	return new Pool({
		name     : connectionName,
		create   : function(callback) {
			var c = new pg.Client(connectionStringOrObject);
			c.connect();
			callback(null, c);
		},
		destroy  : function(client) { client.end(); },
		max      : 10,
		// optional. if you set this, make sure to drain() (see step 3)
		//min      : 2,
		// specifies how long a resource can stay idle in pool before being removed
		idleTimeoutMillis : 30000,
		// if true, logs via console.log - can also be a function
		log : false
	});
}

/**
 * Provides PG data DB client in callback
 * @param name PG data DB
 * @param callback Callback params: err, client, release function
 */
function pgDataDbClient(name, callback) {
										// todo temporarily hard set geonode_data DB
										if(!name){
											name = "geonode";
										}
	if(!name){
		return callback(new Error("conn.getPgDataDb: argument name is null or missing."));
	}
	if(!pgDataDBMap[name]){
		return callback(new Error("conn.getPgDataDb: PostgreSQL database connection with name '"+name+"' not found."));
	}

	acquireClientFromPool(pgDataDBPoolMap[name], callback);
}

/**
 * Provides PG GeoNode service DB client in callback
 * @param callback Callback params: err, client, release function
 */
function pgGeonodeDbClient(callback) {
	acquireClientFromPool(pgGeonodeDBPool, callback);
}

/**
 * Acquire PG DB client from provede pool and call callback with client
 * @param pool
 * @param callback Callback with params: err, client, release function
 */
function acquireClientFromPool(pool, callback){
	pool.acquire(function(err, client) {
		if (err) {
			console.log("\n--------------\nError acquiring client from pool '"+pool.getName()+"'. Error:", err);
			return callback(err);
		}
		console.log("[+] client from pool '"+pool.getName()+"' acquired");
		callback(null, client, function(){
			pool.release(client);
			console.log("   -client from pool '"+pool.getName()+"' released; available "+pool.availableObjectsCount()+"/"+pool.getPoolSize()+" (max "+pool.getMaxPoolSize()+") resources");
		});
	});
}

// todo to be removed
function getPgDataDb(name){
										// todo temporarily hard set geonode_data DB
										if(!name){
											name = "geonode";
										}
	if(!name){
		throw new Error("conn.getPgDataDb: argument name is null or missing.");
	}
	if(!pgDataDBMap[name]){
		throw new Error("conn.getPgDataDb: PostgreSQL database connection with name '"+name+"' not found.");
	}
	return pgDataDBMap[name];
}

// todo to be removed
function getPgGeonodeDb() {
	return pgGeonodeDB;
}

// todo to be removed
function connectToPgDb(connectionStringOrObject, callback) {
	//console.log("--------------- Connecting to PG DB ", connectionStringOrObject);
	var pgDatabase = new pg.Client(connectionStringOrObject);
	pgDatabase.connect(callback);
	return pgDatabase;
}

// todo to be removed
function reconnectPgDB(db, callback){
	//console.log("reconnecting: START " + db.connectionParameters.host+":"+db.connectionParameters.port+"/"+db.connectionParameters.database);
	if (reconnectCommand) {
		clearInterval(reconnectCommand);
	}
	var reconnectCommand = setInterval(function() {
		if(!db.activeQuery){
			//console.log("/------------- DB before end:",db);
			db.end(); // todo this doesn't work. Connection stays an after 30 reconnections, it fails because to many clients.
			var connectionParameters = _.clone(db.connectionParameters);
			//console.log("\\------------- DB after end:",db);
			db = connectToPgDb(connectionParameters, function(err){
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

/**
 * Split workspace:layerName string to object {workspace, layerName}
 * @param layerWithWorkspace String workspace:layerName
 * @returns {{workspace: string, layerName: string}}
 */
function splitWorkspaceLayer(layerWithWorkspace){
	var workspace = "";
	var layerName = "";
	var workspaceDelimiterIndex = layerWithWorkspace.indexOf(":");
	if(workspaceDelimiterIndex == -1){
		console.log("Warning: getLayerTable got parameter '"+layerWithWorkspace+"' without schema delimiter (colon). Returning this string as layerName");
		layerName = layerWithWorkspace;
	}else{
		workspace = layerWithWorkspace.substr(0, workspaceDelimiterIndex);
		layerName = layerWithWorkspace.substr(workspaceDelimiterIndex + 1);
	}
	return {
		workspace: workspace,
		layerName: layerName
	};
}

/**
 * Get layer table with schema (schema.layerName) from layer with geoserver workspace (workspace:layerName)
 * @param layerWithWorkspace {string}  workspace:layerName
 * @returns {string}                   schema.layerName
 */
function getLayerTable(layerWithWorkspace){
	var workspace = splitWorkspaceLayer(layerWithWorkspace).workspace;
	var layerName = splitWorkspaceLayer(layerWithWorkspace).layerName;

	var dbName = getPgDataDbNameForLayer(layerWithWorkspace);
	if(!config.pgDataConnMap[dbName].workspaceSchemaMap.hasOwnProperty(workspace)){
		console.log("Error: getLayerTable got layerWithWorkspace with unknown workspace '"+ workspace +"'.");
		return layerWithWorkspace;
	}
	return config.workspaceSchemaMap[workspace] + "." + layerName;
}

/**
 * Get pgData DB name for layer with workspace string (workspace:layer)
 * @param layerWithWorkspace {string} workspace:layer
 * @returns {string} pgData DB name
 */
function getPgDataDbNameForLayer(layerWithWorkspace){
	var workspace = splitWorkspaceLayer(layerWithWorkspace).workspace;
	//var layerName = splitWorkspaceLayer(layerWithWorkspace).layerName;
	var dbName = null;
	_.each(config.pgDataConnMap, function(db, name){
		if(db.workspaceSchemaMap.hasOwnProperty(workspace)){
			dbName = name;
		}
	}, this);
	return dbName;
}


module.exports = {
	init: init,
	getIo: getIo,
	request: request,
	connectToPgDb: connectToPgDb, // todo to be removed, use createPgPool instead
	createPgPool: createPgPool,
	initDatabases: initDatabases,
	initDatabases_pooling: initDatabases_pooling, // todo to be refactored to initDatabases after removing old initDatabases
	getMongoDb: getMongoDb,
	getPgDataDb: getPgDataDb, // todo to be removed, use pgDataDbClient instead
	pgDataDbClient: pgDataDbClient,
	getPgGeonodeDb: getPgGeonodeDb, // todo to be removed, use pgGeonodeDbClient instead
	pgGeonodeDbClient: pgGeonodeDbClient,
	getNextId: getNextId,
	getLayerTable: getLayerTable,
	getPgDataDbNameForLayer: getPgDataDbNameForLayer
};
